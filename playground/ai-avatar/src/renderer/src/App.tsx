import { useCallback, useEffect, useRef, useState } from 'react'
import type { AsrStatus, AvatarCue, AvatarPose, CliStatus, HooksStatus } from '../../shared/ipc.js'
import type { ModelInfo, PersonalityPreset } from '../../shared/models.js'
import { mergePersonas } from '../../shared/models.js'
import { describeActivity } from '../../shared/hookEvents.js'
import { AvatarStage } from './avatar/AvatarStage.js'
import { MicCapture } from './avatar/MicCapture.js'
import { TerminalView } from './components/Terminal.js'
import { ChatBox } from './components/ChatBox.js'
import { Settings } from './components/Settings.js'

const PLACEHOLDER_MODEL = 'placeholder'

/** Last path segment, cross-platform — the renderer has no node `path`. */
function basename(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}

export function App(): JSX.Element {
  const [cli, setCli] = useState<CliStatus | null>(null)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)
  const [pose, setPose] = useState<AvatarPose>('idle')
  const [expression, setExpression] = useState<string | undefined>(undefined)
  const [showTerminal, setShowTerminal] = useState(true)
  const [hooks, setHooks] = useState<HooksStatus | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [projectDir, setProjectDir] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [customPersonas, setCustomPersonas] = useState<PersonalityPreset[]>([])
  const [selectedModel, setSelectedModel] = useState(PLACEHOLDER_MODEL)
  const [personality, setPersonality] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [sessionNonce, setSessionNonce] = useState(0) // bump to restart the session
  const [micOn, setMicOn] = useState(false)
  const [asr, setAsr] = useState<AsrStatus | null>(null)
  const [caption, setCaption] = useState<string | null>(null)
  const [activity, setActivity] = useState<string | null>(null)
  const idleTimer = useRef<number | undefined>(undefined)
  const noticeTimer = useRef<number | undefined>(undefined)
  const micRef = useRef<MicCapture | null>(null)

  const micPrefRef = useRef(false)
  const micAutoStarted = useRef(false)

  // Detect the CLI up front so we can show install/login guidance instead of crashing.
  useEffect(() => {
    window.companion.detectCli().then(setCli)
    window.companion.hooksStatus().then(setHooks)
    window.companion.listModels().then(setModels)
    window.companion.listPersonas().then(setCustomPersonas)
    window.companion.asrStatus().then(setAsr)
    window.companion.getSettings().then((s) => {
      setProjectDir(s.projectDir)
      setVoiceEnabled(s.voice)
      setSelectedModel(s.avatarModel || PLACEHOLDER_MODEL)
      setPersonality(s.personality)
      micPrefRef.current = s.mic
    })
    return () => micRef.current?.stop()
  }, [])

  const flashNotice = useCallback((text: string) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6000)
  }, [])

  // Return to idle after a quiet beat. Drives the activity heuristic used when hooks
  // aren't installed; real hook cues (below) take precedence by clearing this timer.
  const scheduleIdle = useCallback((delay = 1400) => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setPose('idle'), delay)
  }, [])

  // Authoritative pose source: Claude Code hook cues forwarded from the bridge.
  useEffect(() => {
    return window.companion.onAvatarCue((cue: AvatarCue) => {
      window.clearTimeout(idleTimer.current) // cues outrank the heuristic
      if (cue.pose) {
        setPose(cue.pose)
        // A new turn starting resets last turn's emotion until it's reclassified.
        if (cue.pose === 'thinking' || cue.pose === 'listening') setExpression('neutral')
        if (cue.pose === 'idle') setActivity(null) // turn ended → clear inner-thought
      }
      if (cue.expression) setExpression(cue.expression) // from the emotion agent on Stop
      if (cue.message) flashNotice(cue.message)
      const act = describeActivity(cue.source) // "inner thoughts" from the tool stream
      if (act) setActivity(act)
    })
  }, [flashNotice])

  const handleOutput = useCallback(() => {
    // Heuristic fallback (only meaningful when hooks aren't installed).
    if (hooks?.installed) return
    setPose('working')
    scheduleIdle()
  }, [hooks, scheduleIdle])

  const handleSend = useCallback(() => {
    setPose('listening')
    setExpression('neutral') // new turn resets last turn's emotion
    scheduleIdle(2200)
  }, [scheduleIdle])

  // Live inline [emotion] tags parsed from the terminal stream (mid-reply).
  const handleEmotion = useCallback((emotion: string) => setExpression(emotion), [])

  // Voice input (Phase 6): mic → offline ASR → same PTY stdin; speech start = barge-in.
  const startMic = useCallback(async (): Promise<boolean> => {
    const status = asr ?? (await window.companion.asrStatus())
    setAsr(status)
    if (!status?.available) {
      flashNotice(`Voice input unavailable: ${status?.reason ?? 'no ASR model'}`)
      return false
    }
    if (!micRef.current) micRef.current = new MicCapture()
    await micRef.current.start({
      onSpeechStart: () => {
        window.dispatchEvent(new Event('companion:bargein')) // stop avatar TTS
        setPose('listening')
      },
      onUtterance: async (samples, sr) => {
        const text = await window.companion.transcribe(samples, sr)
        if (text) {
          window.companion.sendInput(text + '\r') // same stdin as the chat box
          setExpression('neutral')
        }
      },
      onError: (e) => {
        flashNotice(`Mic: ${e}`)
        setMicOn(false)
        void window.companion.setSettings({ mic: false })
      }
    })
    setMicOn(true)
    return true
  }, [asr, flashNotice])

  const toggleMic = useCallback(async () => {
    if (micOn) {
      micRef.current?.stop()
      setMicOn(false)
      await window.companion.setSettings({ mic: false })
    } else if (await startMic()) {
      await window.companion.setSettings({ mic: true })
    }
  }, [micOn, startMic])

  // Visual perception: screenshot the screen and hand the path to the session (multimodal).
  const shareScreen = useCallback(async () => {
    flashNotice('Capturing screen…')
    const path = await window.companion.captureScreen()
    if (!path) {
      flashNotice('Screenshot failed — grant Screen Recording permission and retry.')
      return
    }
    window.companion.sendInput(`Take a look at this screenshot of my screen: ${path}\r`)
    handleSend()
    flashNotice('Sent a screenshot to the session.')
  }, [flashNotice, handleSend])

  // Auto-resume mic if it was on last session and an ASR model is available.
  useEffect(() => {
    if (micAutoStarted.current || !asr || !micPrefRef.current) return
    micAutoStarted.current = true
    if (asr.available) void startMic()
  }, [asr, startMic])

  const handleStatus = useCallback((status: CliStatus, ok: boolean) => {
    setCli(status)
    setSessionOk(ok)
  }, [])

  const toggleHooks = useCallback(async () => {
    const next = hooks?.installed
      ? await window.companion.uninstallHooks()
      : await window.companion.installHooks()
    setHooks(next)
    if (next.error) flashNotice(`Hooks: ${next.error}`)
    else if (next.installed)
      flashNotice('Reactions installed for this project — restart the session to apply.')
    else flashNotice('Reactions removed.')
  }, [hooks, flashNotice])

  // Choose the start directory; persist it and restart the session there.
  const changeDir = useCallback(async () => {
    const dir = await window.companion.pickDirectory()
    if (!dir || dir === projectDir) return
    await window.companion.setSettings({ projectDir: dir })
    setProjectDir(dir) // changes the TerminalView key → remounts → new session in `dir`
    window.companion.hooksStatus().then(setHooks) // hooks are scoped per directory
    flashNotice(`Start directory: ${dir} — session restarted.`)
  }, [projectDir, flashNotice])

  const toggleVoice = useCallback(async () => {
    const next = !voiceEnabled
    setVoiceEnabled(next) // AvatarStage's effect cancels any active speech when turned off
    await window.companion.setSettings({ voice: next })
  }, [voiceEnabled])

  // Switch avatar model live (AvatarStage reloads on the resolved modelUrl change).
  const selectModel = useCallback(async (id: string) => {
    setSelectedModel(id)
    await window.companion.setSettings({ avatarModel: id })
  }, [])

  // Persist personality and restart the session so --append-system-prompt takes effect.
  const applyPersonality = useCallback(
    async (text: string) => {
      setPersonality(text)
      await window.companion.setSettings({ personality: text })
      setSessionNonce((n) => n + 1)
      flashNotice(text.trim() ? 'Personality applied — session restarted.' : 'Personality cleared.')
    },
    [flashNotice]
  )

  const needsGuidance = cli && !cli.found
  const reactionsOn = hooks?.installed ?? false
  const dirLabel = projectDir ? basename(projectDir) : '…'
  const activeModel =
    selectedModel !== PLACEHOLDER_MODEL ? models.find((m) => m.id === selectedModel) : undefined
  const modelUrl = activeModel?.modelUrl ?? null

  return (
    <div className="app" data-pose={pose}>
      <header className="titlebar">
        <div className="titlebar-drag">
          <span className="dot" aria-hidden />
          <span className="title">companion</span>
          <span className="pose-tag">{pose}</span>
          {activity && <span className="activity-tag">{activity}</span>}
        </div>
        <div className="titlebar-actions">
          <button
            className="icon-btn dir-btn"
            onClick={changeDir}
            title={projectDir ? `start directory: ${projectDir} — click to change` : 'set start directory'}
          >
            📁 <span className="dir-label">{dirLabel}</span>
          </button>
          <button
            className={`icon-btn${reactionsOn ? ' active' : ''}`}
            onClick={toggleHooks}
            title={reactionsOn ? 'reactions on — click to remove hooks' : 'enable avatar reactions (install hooks)'}
          >
            ⚡
          </button>
          <button
            className={`icon-btn${voiceEnabled ? ' active' : ''}`}
            onClick={toggleVoice}
            title={voiceEnabled ? 'voice on — click to mute' : 'speak replies aloud (TTS)'}
          >
            {voiceEnabled ? '🔊' : '🔈'}
          </button>
          <button
            className={`icon-btn${micOn ? ' active' : ''}`}
            onClick={toggleMic}
            title={
              micOn
                ? 'listening — click to stop'
                : asr?.available === false
                  ? `voice input unavailable: ${asr.reason ?? 'no ASR model'}`
                  : 'voice input (speak to the companion)'
            }
          >
            {micOn ? '🎙️' : '🎤'}
          </button>
          <button
            className="icon-btn"
            onClick={shareScreen}
            title="show the session a screenshot of your screen"
          >
            📷
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title="settings"
          >
            ⚙
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowTerminal((v) => !v)}
            title={showTerminal ? 'hide terminal' : 'show terminal'}
          >
            {showTerminal ? '▤' : '▥'}
          </button>
          <button
            className="icon-btn close"
            onClick={() => window.companion.quit()}
            title="quit"
          >
            ✕
          </button>
        </div>
      </header>

      {notice && <div className="toast">{notice}</div>}

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          projectDir={projectDir}
          onChangeDir={changeDir}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={selectModel}
          personality={personality}
          personas={mergePersonas(customPersonas)}
          onApplyPersonality={applyPersonality}
          voiceEnabled={voiceEnabled}
          onToggleVoice={toggleVoice}
          reactionsOn={reactionsOn}
          onToggleReactions={toggleHooks}
          micOn={micOn}
          onToggleMic={toggleMic}
          asrAvailable={asr?.available ?? false}
          asrReason={asr?.reason}
        />
      )}

      <main className="stage">
        <section className="avatar-pane">
          <AvatarStage
            modelUrl={modelUrl}
            pose={pose}
            expression={expression}
            voiceEnabled={voiceEnabled}
            expressionMap={activeModel?.expressionMap}
            motionMap={activeModel?.motionMap}
            transform={activeModel?.transform}
            onCaption={setCaption}
          />
          {caption && <div className="caption">{caption}</div>}
          <ChatBox onSend={handleSend} />
        </section>

        {showTerminal && (
          <section className="terminal-pane">
            {needsGuidance ? (
              <div className="guidance">
                <h2>Claude Code not found</h2>
                <p>{cli?.guidance}</p>
                <p className="muted">
                  This companion uses your existing Claude Code login. It never needs an
                  Anthropic API key.
                </p>
              </div>
            ) : (
              <>
                {sessionOk === false && (
                  <div className="banner warn">
                    Couldn’t start the session. {cli?.guidance ?? ''}
                  </div>
                )}
                {/* Mount only once the start dir is known, so changing it (key) is the
                    only thing that remounts → exactly one session per directory. */}
                {projectDir && (
                  <TerminalView
                    key={`${projectDir}|${sessionNonce}`}
                    onStatus={handleStatus}
                    onOutput={handleOutput}
                    onEmotion={handleEmotion}
                  />
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
