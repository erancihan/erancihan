/**
 * Thin promise wrapper over child_process for running git and sandboxed commands.
 * Kept tiny and dependency-free so the isolation layer stays easy to test.
 */

import { execFile } from 'node:child_process';

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

/** Whether an executable is resolvable on PATH (uses `which`/`where`). */
export async function commandExists(cmd: string): Promise<boolean> {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = await run(finder, [cmd]);
  return r.code === 0 && r.stdout.trim().length > 0;
}
