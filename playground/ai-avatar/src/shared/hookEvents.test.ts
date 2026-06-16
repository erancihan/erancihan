import { describe, expect, it } from 'vitest'
import { describeActivity, mapEventToCue } from './hookEvents.js'

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

describe('describeActivity', () => {
  it('maps known tools to friendly labels', () => {
    expect(describeActivity('PreToolUse:Edit')).toBe('editing files')
    expect(describeActivity('PostToolUse:Bash')).toBe('running a command')
  })
  it('falls back to "using <tool>" for unknown tools', () => {
    expect(describeActivity('PreToolUse:CustomMcpTool')).toBe('using CustomMcpTool')
  })
  it('returns null when there is no tool', () => {
    expect(describeActivity('Stop')).toBeNull()
    expect(describeActivity(undefined)).toBeNull()
  })
})
