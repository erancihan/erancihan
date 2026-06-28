/**
 * Bounded-concurrency map: run `worker` over `items`, at most `limit` at a time.
 * Results preserve input order; a worker that throws yields a rejected slot the caller
 * can inspect (we never let one failed lane abort the whole pool).
 */

export interface Settled<R> {
  ok: boolean;
  value?: R;
  error?: unknown;
}

export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Settled<R>[]> {
  const results: Settled<R>[] = new Array(items.length);
  const max = Math.max(1, Math.min(limit, items.length));
  let next = 0;

  async function runner(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = { ok: true, value: await worker(items[i], i) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  }

  await Promise.all(Array.from({ length: max }, runner));
  return results;
}
