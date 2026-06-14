import { describe, expect, it } from 'vitest'
import { addManagedHooks, removeManagedHooks, countManagedHooks } from './install.js'
import { MANAGED_HOOKS } from '../../shared/hookEvents.js'

const SCRIPT = '/abs/resources/hooks/cue.mjs'
const build = (event: string): string => `node "${SCRIPT}" --event ${event}`

describe('hook settings merge', () => {
  it('installs an entry for every managed event', () => {
    const next = addManagedHooks({}, SCRIPT, build)
    expect(countManagedHooks(next, SCRIPT)).toBe(MANAGED_HOOKS.length)
    // Tool-scoped events carry a matcher; others don't.
    expect(next.hooks?.PreToolUse?.[0]?.matcher).toBe('*')
    expect(next.hooks?.Stop?.[0]?.matcher).toBeUndefined()
  })

  it('is idempotent — no duplicates on repeated installs', () => {
    const once = addManagedHooks({}, SCRIPT, build)
    const twice = addManagedHooks(once, SCRIPT, build)
    expect(countManagedHooks(twice, SCRIPT)).toBe(MANAGED_HOOKS.length)
    expect(twice.hooks?.PreToolUse).toHaveLength(1)
  })

  it("preserves the user's pre-existing foreign hooks", () => {
    const foreign = {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command' as const, command: 'echo hi' }] }
        ]
      }
    }
    const installed = addManagedHooks(foreign, SCRIPT, build)
    expect(installed.hooks?.PreToolUse).toHaveLength(2) // foreign + ours

    const removed = removeManagedHooks(installed, SCRIPT)
    expect(removed.hooks?.PreToolUse).toHaveLength(1)
    expect(removed.hooks?.PreToolUse?.[0]?.hooks[0]?.command).toBe('echo hi')
    expect(countManagedHooks(removed, SCRIPT)).toBe(0)
  })

  it('prunes keys it fully owns on removal', () => {
    const installed = addManagedHooks({}, SCRIPT, build)
    const removed = removeManagedHooks(installed, SCRIPT)
    expect(removed.hooks).toBeUndefined()
  })
})
