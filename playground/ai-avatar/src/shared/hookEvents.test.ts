import { describe, expect, it } from 'vitest'
import { mapEventToCue } from './hookEvents.js'

describe('mapEventToCue', () => {
  it('maps prompt submit to thinking', () => {
    expect(mapEventToCue({ event: 'UserPromptSubmit' })?.pose).toBe('thinking')
  })

  it('maps tool use to working and includes the tool name in the source', () => {
    const cue = mapEventToCue({ event: 'PreToolUse', data: { tool_name: 'Edit' } })
    expect(cue?.pose).toBe('working')
    expect(cue?.source).toBe('PreToolUse:Edit')
  })

  it('maps notification to alert and passes the message through', () => {
    const cue = mapEventToCue({ event: 'Notification', data: { message: 'Allow Bash?' } })
    expect(cue?.pose).toBe('alert')
    expect(cue?.message).toBe('Allow Bash?')
  })

  it('maps stop to idle', () => {
    expect(mapEventToCue({ event: 'Stop' })?.pose).toBe('idle')
  })

  it('returns null for unknown events', () => {
    expect(mapEventToCue({ event: 'SomethingElse' })).toBeNull()
  })
})
