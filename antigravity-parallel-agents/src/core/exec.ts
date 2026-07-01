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

/**
 * Merge caller-supplied env over the parent environment. A bare `env` passed to
 * spawn/execFile REPLACES process.env entirely, which drops PATH and breaks resolution of
 * unqualified commands — so we always extend rather than replace.
 */
function mergedEnv(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv | undefined {
  return env ? { ...process.env, ...env } : undefined;
}

/** Run a command and capture its output. Never shells out (no shell injection). */
export function run(cmd: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd: opts.cwd, env: mergedEnv(opts.env), signal: opts.signal, maxBuffer: 64 * 1024 * 1024 },
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
  const child = spawn(cmd, args, { cwd: opts.cwd, env: mergedEnv(opts.env), signal: opts.signal });
  // Decode as UTF-8 across chunk boundaries so multibyte characters split between two
  // 'data' events aren't corrupted into replacement characters.
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');

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

  const onOut = (d: string) => push({ stream: 'stdout', data: d });
  const onErr = (d: string) => push({ stream: 'stderr', data: d });
  const onError = (e: Error) => { failure = e; finish(); };
  const onClose = (code: number | null) => { exitCode = code ?? 0; finish(); };
  child.stdout?.on('data', onOut);
  child.stderr?.on('data', onErr);
  child.on('error', onError);
  child.on('close', onClose);

  try {
    while (true) {
      if (queue.length) { yield queue.shift()!; continue; }
      if (done) break;
      await new Promise<void>((r) => { wake = r; });
    }
    if (failure) throw failure;
    return exitCode;
  } finally {
    // If the consumer abandons us early (break/throw/return), tear the process down so we
    // don't leak a live child and its file descriptors.
    child.stdout?.off('data', onOut);
    child.stderr?.off('data', onErr);
    child.off('error', onError);
    child.off('close', onClose);
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

/** Whether an executable is resolvable on PATH (uses `which`/`where`). */
export async function commandExists(cmd: string): Promise<boolean> {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = await run(finder, [cmd]);
  return r.code === 0 && r.stdout.trim().length > 0;
}
