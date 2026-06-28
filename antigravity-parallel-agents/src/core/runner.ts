/**
 * Lane runners drive a single agent to completion inside an already-isolated lane.
 *
 * `ProcessLaneRunner` is the real, generic workhorse: it runs ANY agent command in the
 * lane's worktree (sandbox-wrapped), streams its output, then stages+commits whatever the
 * agent changed so the work is ready for merge-back. The Antigravity CLI is just one
 * preset (`CliLaneRunner`); a cloud backend (`ManagedAgentsLaneRunner`, see client.ts) is
 * an alternative. The orchestrator depends only on the `LaneRunner` interface.
 */

import { join, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { run, streamLines } from './exec.js';
import type { SandboxProvider } from './isolation.js';
import type { LaneIsolation, LaneResult } from './types.js';

export interface RunnerInput {
  prompt: string;
  isolation: LaneIsolation;
  agentsMd?: string;
  skills?: Array<{ name: string; body: string }>;
  signal?: AbortSignal;
}

export interface RunnerUpdate {
  lastAction?: string;
  chunk?: string;
  done: boolean;
  result?: LaneResult;
}

export interface LaneRunner {
  run(input: RunnerInput): AsyncIterable<RunnerUpdate>;
}

export interface ProcessRunnerOptions {
  /** Executable to run (e.g. an agent CLI). */
  command: string;
  /**
   * Argument template. Tokens are substituted per lane:
   *   ${prompt}       the task text
   *   ${worktree}     absolute path to the lane's worktree (also the cwd)
   *   ${agentsMdPath} path to the mounted AGENTS.md ('' if none)
   */
  args: string[];
  /** Sandbox to confine the process (defaults to none → worktree-only isolation). */
  sandbox?: SandboxProvider;
  env?: NodeJS.ProcessEnv;
  /** Write AGENTS.md + skills into the worktree before running (default true). */
  mountConfig?: boolean;
  /** Stage + commit the agent's changes after a successful run (default true). */
  commit?: boolean;
  /** Max stdout characters kept for the result summary (default 8000). */
  maxOutputChars?: number;
}

export class ProcessLaneRunner implements LaneRunner {
  constructor(private readonly opts: ProcessRunnerOptions) {}

  async *run(input: RunnerInput): AsyncIterable<RunnerUpdate> {
    const wt = input.isolation.worktree;
    const mountConfig = this.opts.mountConfig ?? true;

    let agentsMdPath = '';
    if (mountConfig && input.agentsMd) {
      agentsMdPath = join(wt, 'AGENTS.md');
      await writeFile(agentsMdPath, input.agentsMd);
    }
    if (mountConfig && input.skills?.length) {
      for (const skill of input.skills) {
        const file = join(wt, '.agents', 'skills', skill.name, 'SKILL.md');
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, skill.body);
      }
    }

    const subst = (s: string) =>
      s.replaceAll('${prompt}', input.prompt)
        .replaceAll('${worktree}', wt)
        .replaceAll('${agentsMdPath}', agentsMdPath);

    let cmd = this.opts.command;
    let args = this.opts.args.map(subst);
    if (this.opts.sandbox) {
      const wrapped = this.opts.sandbox.wrap(cmd, args, wt);
      cmd = wrapped.cmd;
      args = wrapped.args;
    }

    yield { lastAction: `running ${this.opts.command}`, done: false };

    const buf: string[] = [];
    let size = 0;
    const cap = this.opts.maxOutputChars ?? 8000;
    const stream = streamLines(cmd, args, { cwd: wt, env: this.opts.env, signal: input.signal });

    let exitCode = 0;
    while (true) {
      const next = await stream.next();
      if (next.done) { exitCode = next.value; break; }
      const { data } = next.value;
      if (size < cap) { buf.push(data); size += data.length; }
      yield { chunk: data, done: false };
    }

    if (exitCode !== 0) {
      throw new Error(`agent command exited with code ${exitCode}`);
    }

    const result = await this.collectResult(wt, input.prompt, buf.join('').slice(-cap));
    yield { lastAction: 'completed', done: true, result };
  }

  /** Stage + commit the agent's changes; return the patch + a text summary. */
  private async collectResult(worktree: string, prompt: string, text: string): Promise<LaneResult> {
    await run('git', ['add', '-A'], { cwd: worktree });
    const staged = await run('git', ['diff', '--cached'], { cwd: worktree });
    const patch = staged.stdout;
    if (patch.trim().length > 0 && (this.opts.commit ?? true)) {
      const subject = `swarm: ${prompt.replace(/\s+/g, ' ').slice(0, 60)}`;
      await run('git', ['commit', '-m', subject], { cwd: worktree });
    }
    return { text: text.trim() || 'completed', patch: patch || undefined };
  }
}

/**
 * Antigravity CLI preset — PROVISIONAL flags (docs/PLAN.md §6 Q2). The exact headless
 * invocation isn't published yet; override `command`/`args` once confirmed. Structurally
 * it's a normal ProcessLaneRunner, so it goes live with no orchestrator changes.
 */
export class CliLaneRunner extends ProcessLaneRunner {
  constructor(opts: Partial<ProcessRunnerOptions> = {}) {
    super({
      command: opts.command ?? 'antigravity',
      args: opts.args ?? ['agent', 'run', '--cwd', '${worktree}', '--prompt', '${prompt}'],
      ...opts,
    });
  }
}
