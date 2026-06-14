import { useCallback, useEffect, useRef, useState } from 'react'
import type { AvatarPose, CliStatus } from '../../shared/ipc.js'
import { AvatarStage } from './avatar/AvatarStage.js'
import { TerminalView } from './components/Terminal.js'
import { ChatBox } from './components/ChatBox.js'

// MVP: no bundled Live2D model is shipped, so we run the placeholder backend.
// Drop a model under resources/models/<id> and point this at its model3.json URL
// to switch backends — nothing else changes (see AvatarController).
const MODEL_URL: string | null = null

export function App(): JSX.Element {
  const [cli, setCli] = useState<CliStatus | null>(null)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)
  const [pose, setPose] = useState<AvatarPose>('idle')
  const [showTerminal, setShowTerminal] = useState(true)
  const idleTimer = useRef<number | undefined>(undefined)

  // Detect the CLI up front so we can show install/login guidance instead of crashing.
  useEffect(() => {
    window.companion.detectCli().then(setCli)
  }, [])

  // Return to idle after a quiet beat. Used by the activity-driven pose nudges below;
  // Phase 2 replaces this heuristic with real Claude Code hooks.
  const scheduleIdle = useCallback((delay = 1400) => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setPose('idle'), delay)
  }, [])

  const handleOutput = useCallback(() => {
    setPose('working')
    scheduleIdle()
  }, [scheduleIdle])

  const handleSend = useCallback(() => {
    setPose('listening')
    scheduleIdle(2200)
  }, [scheduleIdle])

  const handleStatus = useCallback((status: CliStatus, ok: boolean) => {
    setCli(status)
    setSessionOk(ok)
  }, [])

  const needsGuidance = cli && !cli.found

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

      <main className="stage">
        <section className="avatar-pane">
          <AvatarStage modelUrl={MODEL_URL} pose={pose} />
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
                <TerminalView onStatus={handleStatus} onOutput={handleOutput} />
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
