import { describe, it, expect } from 'vitest';
import { mapPool } from './pool.js';

describe('mapPool', () => {
  it('runs every item and preserves order', async () => {
    const out = await mapPool([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out.map((s) => s.value)).toEqual([10, 20, 30, 40]);
    expect(out.every((s) => s.ok)).toBe(true);
  });

  it('caps concurrency at the limit', async () => {
    let active = 0;
    let peak = 0;
    await mapPool(Array.from({ length: 8 }, (_, i) => i), 3, async () => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it('a non-finite limit (NaN) still runs every item instead of spawning zero workers', async () => {
    const out = await mapPool([1, 2, 3], Number.NaN, async (n) => n);
    expect(out.map((s) => s.value)).toEqual([1, 2, 3]);
  });

  it('isolates a throwing worker to its own slot', async () => {
    const out = await mapPool([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error('boom');
      return n;
    });
    expect(out[0]).toMatchObject({ ok: true, value: 1 });
    expect(out[1].ok).toBe(false);
    expect(out[2]).toMatchObject({ ok: true, value: 3 });
  });
});
