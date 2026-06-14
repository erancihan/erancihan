import { useCallback, useEffect, useRef, useState } from 'react'
import type { AvatarCue, AvatarPose, CliStatus, HooksStatus } from '../../shared/ipc.js'
import { AvatarStage } from './avatar/AvatarStage.js'
import { TerminalView } from './components/Terminal.js'
import { ChatBox } from './components/ChatBox.js'

// MVP: no bundled Live2D model is shipped, so we run the placeholder backend.
// Drop a model under resources/models/<id> and point this at its model3.json URL
// to switch backends — nothing else changes (see AvatarController).
const MODEL_URL: string | null = null

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
  const idleTimer = useRef<number | undefined>(undefined)
  const noticeTimer = useRef<number | undefined>(undefined)

  // Detect the CLI up front so we can show install/login guidance instead of crashing.
  useEffect(() => {
    window.companion.detectCli().then(setCli)
    window.companion.hooksStatus().then(setHooks)
    window.companion.getSettings().then((s) => setProjectDir(s.projectDir))
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
      }
      if (cue.expression) setExpression(cue.expression) // from the emotion agent on Stop
      if (cue.message) flashNotice(cue.message)
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
    scheduleIdle(2200)
  }, [scheduleIdle])

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

  const needsGuidance = cli && !cli.found
  const reactionsOn = hooks?.installed ?? false
  const dirLabel = projectDir ? basename(projectDir) : '…'

  return (
    <div className="app" data-pose={pose}>
      <header className="titlebar">
        <div className="titlebar-drag">
          <span className="dot" aria-hidden />
          <span className="title">companion</span>
          <span className="pose-tag">{pose}</span>
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

      <main className="stage">
        <section className="avatar-pane">
          <AvatarStage modelUrl={MODEL_URL} pose={pose} expression={expression} />
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
                    key={projectDir}
                    onStatus={handleStatus}
                    onOutput={handleOutput}
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
