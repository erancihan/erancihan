import { describe, it, expect } from 'vitest';
import { parse, numericFlag } from './main.js';

describe('CLI parse()', () => {
  it('parses positionals, space-separated flags, and repeated --arg', () => {
    const p = parse(['run', 'task a', '--concurrency', '3', '--arg', '-e', '--arg', 'x.js']);
    expect(p._).toEqual(['run', 'task a']);
    expect(p.flags.concurrency).toBe('3');
    expect(p.args).toEqual(['-e', 'x.js']);
    expect(p.errors).toEqual([]);
  });

  it('supports the --flag=value form', () => {
    const p = parse(['run', '--file=tasks.txt', '--command=node']);
    expect(p.flags.file).toBe('tasks.txt');
    expect(p.flags.command).toBe('node');
  });

  it('allows a value that begins with -- via the = form', () => {
    const p = parse(['run', '--command=--my-agent']);
    expect(p.flags.command).toBe('--my-agent');
  });

  it('treats a boolean flag followed by another flag as true', () => {
    const p = parse(['run', '--no-sandbox', '--squash']);
    expect(p.flags['no-sandbox']).toBe(true);
    expect(p.flags.squash).toBe(true);
  });

  it('records an error for a trailing --arg with no value (instead of pushing undefined)', () => {
    const p = parse(['run', 'task', '--arg']);
    expect(p.args).toEqual([]);
    expect(p.errors).toContain('--arg requires a value');
  });
});

describe('numericFlag()', () => {
  it('returns the number for valid input', () => {
    expect(numericFlag({ concurrency: '4' }, 'concurrency', { min: 1 })).toBe(4);
  });
  it('returns undefined when absent', () => {
    expect(numericFlag({}, 'concurrency')).toBeUndefined();
  });
  it('returns an error object for non-numeric or out-of-range input', () => {
    expect(numericFlag({ concurrency: 'abc' }, 'concurrency', { min: 1 })).toMatchObject({ error: expect.any(String) });
    expect(numericFlag({ concurrency: '0' }, 'concurrency', { min: 1 })).toMatchObject({ error: expect.any(String) });
  });
});
