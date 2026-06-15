import { useState } from 'react'
import type { ModelInfo } from '../../../shared/models.js'
import { PERSONALITY_PRESETS } from '../../../shared/models.js'

interface SettingsProps {
  onClose: () => void
  projectDir: string | null
  onChangeDir: () => void
  models: ModelInfo[]
  selectedModel: string
  onSelectModel: (id: string) => void
  /** Current personality text (already persisted value). */
  personality: string
  /** Persist personality and restart the session. */
  onApplyPersonality: (text: string) => void
  voiceEnabled: boolean
  onToggleVoice: () => void
  reactionsOn: boolean
  onToggleReactions: () => void
}

const PLACEHOLDER = 'placeholder'

/**
 * The full customization surface (Phase 5): avatar model + license, personality preset,
 * start directory, and the voice/reactions toggles. Presentational — App owns the state
 * and the side effects (persist, restart, reload).
 */
export function Settings(props: SettingsProps): JSX.Element {
  const { models, selectedModel, personality } = props
  const [draftPersonality, setDraftPersonality] = useState(personality)
  const activeModel = models.find((m) => m.id === selectedModel)
  const personalityDirty = draftPersonality.trim() !== personality.trim()

  // Choosing a preset fills the editable textarea; the text is what actually applies.
  const onPreset = (id: string): void => {
    const preset = PERSONALITY_PRESETS.find((p) => p.id === id)
    if (preset) setDraftPersonality(preset.prompt)
  }

  return (
    <div className="settings-scrim" onClick={props.onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <header className="settings-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={props.onClose} title="close">
            ✕
          </button>
        </header>

        <section className="settings-row">
          <label>Avatar model</label>
          <div className="settings-field">
            <select value={selectedModel} onChange={(e) => props.onSelectModel(e.target.value)}>
              <option value={PLACEHOLDER}>Built-in companion (placeholder)</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {activeModel?.license && (
              <p className="settings-note">
                License: {activeModel.license}
                {activeModel.author ? ` · ${activeModel.author}` : ''}
              </p>
            )}
            {models.length === 0 && (
              <p className="settings-note muted">
                No Live2D models found. Drop one under <code>resources/models/&lt;id&gt;</code>
                {' '}and add the Cubism runtime to enable it.
              </p>
            )}
          </div>
        </section>

        <section className="settings-row">
          <label>Personality</label>
          <div className="settings-field">
            <select defaultValue="" onChange={(e) => onPreset(e.target.value)}>
              <option value="" disabled>
                Choose a preset…
              </option>
              {PERSONALITY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <textarea
              className="settings-personality"
              rows={4}
              placeholder="Appended to Claude Code via --append-system-prompt. Leave empty for default."
              value={draftPersonality}
              onChange={(e) => setDraftPersonality(e.target.value)}
            />
            <button
              className="settings-apply"
              disabled={!personalityDirty}
              onClick={() => props.onApplyPersonality(draftPersonality)}
            >
              Apply &amp; restart session
            </button>
          </div>
        </section>

        <section className="settings-row">
          <label>Start directory</label>
          <div className="settings-field">
            <code className="settings-path">{props.projectDir ?? '…'}</code>
            <button className="settings-apply" onClick={props.onChangeDir}>
              Change…
            </button>
          </div>
        </section>

        <section className="settings-row">
          <label>Behavior</label>
          <div className="settings-field settings-toggles">
            <label className="settings-check">
              <input type="checkbox" checked={props.reactionsOn} onChange={props.onToggleReactions} />
              Avatar reactions (installs Claude Code hooks)
            </label>
            <label className="settings-check">
              <input type="checkbox" checked={props.voiceEnabled} onChange={props.onToggleVoice} />
              Speak replies aloud (TTS)
            </label>
          </div>
        </section>

        <footer className="settings-foot muted">
          Uses your existing Claude Code login — never an Anthropic API key.
        </footer>
      </div>
    </div>
  )
}
