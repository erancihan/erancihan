import { describe, expect, it, vi } from 'vitest'
import { PtyService, type PtyLike, type PtySpawn } from './ptyService.js'

/** Controllable fake PTY — exit is fired manually to emulate node-pty's async kill→exit. */
class FakePty implements PtyLike {
  written: string[] = []
  killed = false
  private exitHandlers: ((e: { exitCode: number }) => void)[] = []
  onData(): void {}
  onExit(cb: (e: { exitCode: number }) => void): void {
    this.exitHandlers.push(cb)
  }
  write(data: string): void {
    this.written.push(data)
  }
  resize(): void {}
  kill(): void {
    this.killed = true
  }
  /** Simulate the delayed exit that a real PTY emits after being killed. */
  triggerExit(code = 0): void {
    this.exitHandlers.forEach((h) => h({ exitCode: code }))
  }
}

function fakeSpawnFactory(queue: FakePty[]): PtySpawn {
  return () => {
    const next = queue.shift()
    if (!next) throw new Error('no fake pty queued')
    return next
  }
}

const opts = { command: 'claude', cwd: '/tmp', size: { cols: 80, rows: 24 } }

describe('PtyService restart race (StrictMode double-mount)', () => {
  it('keeps writing to the live PTY after a superseded PTY exits', () => {
    const pty1 = new FakePty()
    const pty2 = new FakePty()
    const service = new PtyService(fakeSpawnFactory([pty1, pty2]))

    const cb1 = { onData: vi.fn(), onExit: vi.fn() }
    const cb2 = { onData: vi.fn(), onExit: vi.fn() }

    // Two starts in quick succession (the StrictMode pattern).
    service.start(opts, cb1)
    service.start(opts, cb2)
    expect(pty1.killed).toBe(true)

    // The killed PTY₁ now emits its delayed exit, AFTER PTY₂ is live.
    pty1.triggerExit(0)

    // Regression: PTY₁'s stale onExit must NOT clear the reference to live PTY₂.
    expect(service.isRunning()).toBe(true)

    // And input must reach the live PTY₂.
    service.write('hello\r')
    expect(pty2.written).toContain('hello\r')

    // A superseded PTY's exit must not be reported to the UI as a session end.
    expect(cb1.onExit).not.toHaveBeenCalled()
  })

  it('reports exit to the UI when the current PTY actually exits', () => {
    const pty = new FakePty()
    const service = new PtyService(fakeSpawnFactory([pty]))
    const cb = { onData: vi.fn(), onExit: vi.fn() }

    service.start(opts, cb)
    pty.triggerExit(3)

    expect(cb.onExit).toHaveBeenCalledWith(3)
    expect(service.isRunning()).toBe(false)
  })
})
