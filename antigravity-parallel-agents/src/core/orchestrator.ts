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
import type { JournalStore, JournalState } from './journal.js';
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
  /** Optional persistence so a crashed run can resume(). */
  journal?: JournalStore;
  /** Override id generation (tests inject deterministic ids). */
  laneId?: (task: Task, index: number) => string;
}

/** Lane statuses that are terminal-success and should NOT be re-run on resume. */
const isComplete = (s: LaneStatus): boolean => s === 'done';

export class Orchestrator {
  private readonly events = new Emitter<SwarmEvent>();

  constructor(private readonly deps: OrchestratorDeps) {}

  /** Subscribe to the typed event stream; returns an unsubscribe fn. */
  on(listener: (e: SwarmEvent) => void): () => void {
    return this.events.on(listener);
  }

  async run(tasks: Task[], options: RunOptions): Promise<RunSummary> {
    const runId = options.runId ?? `run-${Date.now()}-${tasks.length}`;
    const lanes: Lane[] = tasks.map((task, i) => ({
      id: this.deps.laneId?.(task, i) ?? task.id,
      task,
      status: 'queued',
    }));
    const state: JournalState = { runId, repoRoot: this.deps.repoRoot, options, lanes, updatedAt: Date.now() };
    return this.execute(state);
  }

  /**
   * Resume a previously-journaled run: completed lanes are kept, everything else is
   * reset to `queued` and re-run (a re-run lane discards any partial worktree/branch).
   */
  async resume(runId: string): Promise<RunSummary> {
    if (!this.deps.journal) throw new Error('resume() requires a journal store in deps');
    const state = await this.deps.journal.load(runId);
    if (!state) throw new Error(`No journal found for run ${runId}`);
    for (const lane of state.lanes) {
      if (!isComplete(lane.status)) {
        lane.status = 'queued';
        lane.error = undefined;
        lane.isolation = undefined;
      }
    }
    return this.execute(state);
  }

  private async execute(state: JournalState): Promise<RunSummary> {
    const { runId, lanes, options } = state;
    const pending = lanes.filter((l) => !isComplete(l.status));
    this.events.emit({ type: 'run:start', runId, lanes: lanes.length });
    await this.persist(state);

    // Seed the budget with cost already spent by previously-completed lanes.
    const budget = new BudgetGuard(options.budgetUsd);
    for (const l of lanes) if (isComplete(l.status)) budget.add(l.result?.usage?.costUsd ?? 0);
    const ac = new AbortController();

    await mapPool(pending, options.concurrency, async (lane) => {
      if (ac.signal.aborted) {
        await this.transition(state, lane, 'cancelled');
        return;
      }
      await this.runLane(state, lane, options, budget, ac);
    });

    this.events.emit({ type: 'run:done', runId, lanes });
    state.updatedAt = Date.now();
    await this.persist(state);
    return { runId, lanes, totalCostUsd: budget.spent };
  }

  private async runLane(state: JournalState, lane: Lane, options: RunOptions, budget: BudgetGuard, ac: AbortController) {
    await this.transition(state, lane, 'starting');
    lane.startedAt = Date.now();
    try {
      lane.isolation = await this.deps.isolation.acquire({
        laneId: lane.id,
        repoRoot: this.deps.repoRoot,
      });
      await this.transition(state, lane, 'running');

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
      await this.transition(state, lane, ac.signal.aborted ? 'cancelled' : 'done');

      // Preserve the branch for merge-back only if the lane produced work.
      const producedWork = Boolean(lane.result?.patch || lane.result?.text);
      await this.deps.isolation.release(lane.isolation, { keepBranch: producedWork });

      // Budget accounting — stop scheduling further lanes if we've blown the ceiling.
      const cost = lane.result?.usage?.costUsd ?? 0;
      if (budget.add(cost) && !ac.signal.aborted) {
        ac.abort();
      }
    } catch (error) {
      lane.endedAt = Date.now();
      lane.error = error instanceof Error ? error.message : String(error);
      await this.transition(state, lane, ac.signal.aborted ? 'cancelled' : 'failed');
      if (lane.isolation) {
        await this.deps.isolation.release(lane.isolation, { keepBranch: false }).catch(() => undefined);
      }
    }
  }

  private async transition(state: JournalState, lane: Lane, status: LaneStatus): Promise<void> {
    lane.status = status;
    this.events.emit({ type: 'lane:update', lane });
    await this.persist(state);
  }

  private async persist(state: JournalState): Promise<void> {
    if (!this.deps.journal) return;
    state.updatedAt = Date.now();
    await this.deps.journal.save(state).catch(() => undefined);
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
