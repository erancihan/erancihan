/**
 * Thin promise wrapper over child_process for running git and sandboxed commands.
 * Kept tiny and dependency-free so the isolation layer stays easy to test.
 */

import { execFile, spawn } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Reject (instead of resolving with a non-zero code) on failure. */
  throwOnError?: boolean;
  signal?: AbortSignal;
}

/** Run a command and capture its output. Never shells out (no shell injection). */
export function run(cmd: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd: opts.cwd, env: opts.env, signal: opts.signal, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const code = err && typeof (err as { code?: unknown }).code === 'number'
          ? (err as { code: number }).code
          : err
            ? 1
            : 0;
        const result: ExecResult = { stdout: String(stdout), stderr: String(stderr), code };
        if (err && (opts.throwOnError ?? false)) {
          reject(Object.assign(err, result));
          return;
        }
        resolve(result);
      },
    );
  });
}

/** Convenience: run, throw on non-zero, return trimmed stdout. */
export async function output(cmd: string, args: string[], opts: ExecOptions = {}): Promise<string> {
  const r = await run(cmd, args, { ...opts, throwOnError: true });
  return r.stdout.trim();
}

export interface StreamChunk {
  stream: 'stdout' | 'stderr';
  data: string;
}

/**
 * Spawn a command and yield its output incrementally; the generator's return value is the
 * exit code. Throws if the process can't be spawned (e.g. command not found) or is aborted.
 */
export async function* streamLines(
  cmd: string,
  args: string[],
  opts: ExecOptions = {},
): AsyncGenerator<StreamChunk, number, void> {
  const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env, signal: opts.signal });

  const queue: StreamChunk[] = [];
  let wake: (() => void) | null = null;
  let done = false;
  let exitCode = 0;
  let failure: Error | undefined;

  const push = (item: StreamChunk) => {
    queue.push(item);
    wake?.();
    wake = null;
  };
  const finish = () => { done = true; wake?.(); wake = null; };

  child.stdout?.on('data', (d) => push({ stream: 'stdout', data: d.toString() }));
  child.stderr?.on('data', (d) => push({ stream: 'stderr', data: d.toString() }));
  child.on('error', (e) => { failure = e; finish(); });
  child.on('close', (code) => { exitCode = code ?? 0; finish(); });

  while (true) {
    if (queue.length) { yield queue.shift()!; continue; }
    if (done) break;
    await new Promise<void>((r) => { wake = r; });
  }
  if (failure) throw failure;
  return exitCode;
}

/** Whether an executable is resolvable on PATH (uses `which`/`where`). */
export async function commandExists(cmd: string): Promise<boolean> {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = await run(finder, [cmd]);
  return r.code === 0 && r.stdout.trim().length > 0;
}
