/**
 * Run journal — persistence so a crashed IDE can resume in-flight lanes.
 *
 * The Orchestrator writes the whole run state (tasks + per-lane status/isolation/result)
 * on every transition. On resume we keep `done` lanes and re-run the rest. Writes are
 * full-state + atomic (tmp file + rename) and serialized, so concurrent lane updates can
 * never tear the file. See docs/PLAN.md §3.1.
 */

import { mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { Lane, RunOptions } from './types.js';

export interface JournalState {
  runId: string;
  repoRoot: string;
  options: RunOptions;
  lanes: Lane[];
  updatedAt: number;
}

export interface JournalStore {
  save(state: JournalState): Promise<void>;
  load(runId: string): Promise<JournalState | null>;
}

/** In-memory store for tests. */
export class MemoryJournalStore implements JournalStore {
  private states = new Map<string, JournalState>();
  async save(state: JournalState): Promise<void> {
    // Deep clone so later mutations of the live lane objects don't bleed in.
    this.states.set(state.runId, structuredClone(state));
  }
  async load(runId: string): Promise<JournalState | null> {
    const s = this.states.get(runId);
    return s ? structuredClone(s) : null;
  }
}

/** JSON-on-disk store, one file per run under `<dir>` (default `.swarm/journal`). */
export class FileJournalStore implements JournalStore {
  private writeChain: Promise<unknown> = Promise.resolve();
  constructor(private readonly dir: string) {}

  private file(runId: string): string {
    return join(this.dir, `${runId}.json`);
  }

  async save(state: JournalState): Promise<void> {
    // Serialize writes; each writes the full current snapshot (last-write-wins, atomic).
    const snapshot = structuredClone(state);
    const write = async () => {
      await mkdir(this.dir, { recursive: true });
      const target = this.file(snapshot.runId);
      const tmp = `${target}.${snapshot.updatedAt}.tmp`;
      await writeFile(tmp, JSON.stringify(snapshot, null, 2));
      await rename(tmp, target);
    };
    // Chain on a SETTLED tail (run `write` whether the previous save fulfilled or rejected)
    // so one transient FS failure can't permanently poison the chain and silently freeze
    // every subsequent save.
    const result = this.writeChain.then(write, write);
    this.writeChain = result.catch(() => undefined);
    await result;
  }

  async load(runId: string): Promise<JournalState | null> {
    try {
      return JSON.parse(await readFile(this.file(runId), 'utf8')) as JournalState;
    } catch {
      return null;
    }
  }
}
