/**
 * Orchestrator — the parallel engine.
 *
 * Takes a batch of tasks and runs each as an isolated lane (worktree + sandbox), capped at
 * `concurrency`, streaming typed events the whole way. One lane failing never aborts the
 * run; an optional cost budget stops scheduling new lanes once exceeded. See docs/PLAN.md
 * §3.1.
 *
 * Depends only on the IsolationProvider + LaneRunner *interfaces*, so it's fully testable
 * with fakes and works identically over local (CLI) or cloud (Managed Agents) runners.
 */

import { Emitter } from './emitter.js';
import { mapPool } from './pool.js';
import { IsolationProvider } from './isolation.js';
import type { LaneRunner } from './runner.js';
import type { Lane, Task, RunOptions, SwarmEvent, LaneStatus } from './types.js';

export interface RunSummary {
  runId: string;
  lanes: Lane[];
  totalCostUsd: number;
}

export interface OrchestratorDeps {
  isolation: IsolationProvider;
  runner: LaneRunner;
  /** Repo the lanes branch from. */
  repoRoot: string;
  /** Override id generation (tests inject deterministic ids). */
  laneId?: (task: Task, index: number) => string;
}

export class Orchestrator {
  private readonly events = new Emitter<SwarmEvent>();

  constructor(private readonly deps: OrchestratorDeps) {}

  /** Subscribe to the typed event stream; returns an unsubscribe fn. */
  on(listener: (e: SwarmEvent) => void): () => void {
    return this.events.on(listener);
  }

  async run(tasks: Task[], options: RunOptions): Promise<RunSummary> {
    const runId = `run-${tasks.length}`;
    const lanes: Lane[] = tasks.map((task, i) => ({
      id: this.deps.laneId?.(task, i) ?? task.id,
      task,
      status: 'queued',
    }));
    this.events.emit({ type: 'run:start', runId, lanes: lanes.length });

    const budget = new BudgetGuard(options.budgetUsd);
    const ac = new AbortController();

    await mapPool(lanes, options.concurrency, async (lane) => {
      if (ac.signal.aborted) {
        this.transition(lane, 'cancelled');
        return;
      }
      await this.runLane(lane, options, budget, ac);
    });

    const totalCostUsd = budget.spent;
    this.events.emit({ type: 'run:done', runId, lanes });
    return { runId, lanes, totalCostUsd };
  }

  private async runLane(lane: Lane, options: RunOptions, budget: BudgetGuard, ac: AbortController) {
    this.transition(lane, 'starting');
    lane.startedAt = Date.now();
    try {
      lane.isolation = await this.deps.isolation.acquire({
        laneId: lane.id,
        repoRoot: this.deps.repoRoot,
      });
      this.transition(lane, 'running');

      const stream = this.deps.runner.run({
        prompt: lane.task.prompt,
        isolation: lane.isolation,
        agentsMd: lane.task.agentsMd ?? options.agentsMd,
        skills: lane.task.skills ?? options.skills,
        signal: ac.signal,
      });

      for await (const update of stream) {
        if (update.lastAction) {
          lane.lastAction = update.lastAction;
          this.events.emit({ type: 'lane:update', lane });
        }
        if (update.chunk) {
          this.events.emit({ type: 'lane:output', laneId: lane.id, chunk: update.chunk });
        }
        if (update.done && update.result) {
          lane.result = update.result;
        }
      }

      lane.endedAt = Date.now();
      this.transition(lane, lane.status === 'cancelled' ? 'cancelled' : 'done');

      // Preserve the branch for merge-back only if the lane produced work.
      const producedWork = Boolean(lane.result?.patch || lane.result?.text);
      await this.deps.isolation.release(lane.isolation, { keepBranch: producedWork });

      // Budget accounting — stop scheduling further lanes if we've blown the ceiling.
      const cost = lane.result?.usage?.costUsd ?? 0;
      if (budget.add(cost) && !ac.signal.aborted) {
        this.events.emit({ type: 'lane:update', lane });
        ac.abort();
      }
    } catch (error) {
      lane.endedAt = Date.now();
      lane.error = error instanceof Error ? error.message : String(error);
      this.transition(lane, ac.signal.aborted ? 'cancelled' : 'failed');
      if (lane.isolation) {
        await this.deps.isolation.release(lane.isolation, { keepBranch: false }).catch(() => undefined);
      }
    }
  }

  private transition(lane: Lane, status: LaneStatus): void {
    lane.status = status;
    this.events.emit({ type: 'lane:update', lane });
  }
}

/** Tracks cumulative cost; `add`/exceeded report whether the ceiling was crossed. */
class BudgetGuard {
  spent = 0;
  constructor(private readonly limit?: number) {}
  /** Returns true if this addition pushes cumulative spend past the limit. */
  add(costUsd: number): boolean {
    this.spent += costUsd;
    return this.limit !== undefined && this.spent >= this.limit;
  }
}
