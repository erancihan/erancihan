import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { CliStatus } from '../../../shared/ipc.js'
import type { Emotion } from '../../../shared/emotion.js'
import { splitForTagStream } from '../../../shared/emotion.js'

interface TerminalViewProps {
  /** Called with the CLI status once the session start is attempted. */
  onStatus: (status: CliStatus, ok: boolean) => void
  /** Activity signal so the avatar can react before Phase-2 hooks exist. */
  onOutput: () => void
  /** Live inline [emotion] tags parsed from the stream (mid-reply expression). */
  onEmotion: (emotion: Emotion) => void
}

/**
 * xterm.js view of the live `claude` PTY. This is the real interactive session —
 * the user can type directly here, and the avatar chat box writes to the same stdin.
 * IO crosses to the Node side only through the preload `companion` bridge.
 */
export function TerminalView({ onStatus, onOutput, onEmotion }: TerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Carry between PTY chunks so an [emotion] tag split across reads is still caught.
    let tagCarry = ''

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      allowTransparency: true,
      theme: {
        background: 'rgba(0,0,0,0)',
        foreground: '#f3e9d8',
        cursor: '#f0a868',
        cursorAccent: '#1a1822',
        selectionBackground: 'rgba(240,168,104,0.3)',
        black: '#2a2433',
        brightBlack: '#5b5468'
      }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)

    let inputSub: { dispose(): void } | undefined
    let offData: (() => void) | undefined
    let offExit: (() => void) | undefined
    let booted = false

    // Open + wire IO + start the session only once the container has a real size. Opening
    // xterm at 0×0 (before layout) renders against undefined dimensions and throws — so we
    // defer until a non-zero ResizeObserver measurement (or immediately if already sized).
    const boot = (): void => {
      if (booted || !container.clientWidth || !container.clientHeight) return
      booted = true
      term.open(container)
      // Defer the first fit a frame: right after open() xterm's renderer isn't attached
      // yet, and FitAddon → RenderService.dimensions would read it as undefined and throw.
      requestAnimationFrame(safeFit)

      inputSub = term.onData((data) => window.companion.sendInput(data))

      // PTY stdout → renderer. Strip inline [emotion] tags from the visible stream and
      // drive the avatar expression live; ANSI escapes pass through untouched.
      offData = window.companion.onTerminalData((data) => {
        const { text, emotions, carry } = splitForTagStream(tagCarry, data)
        tagCarry = carry
        term.write(text)
        emotions.forEach(onEmotion)
        onOutput()
      })
      offExit = window.companion.onTerminalExit((code) => {
        term.write(`\r\n\x1b[2m[claude session exited (${code})]\x1b[0m\r\n`)
      })

      window.companion
        .startTerminal({ cols: term.cols, rows: term.rows })
        .then((res) => onStatus(res.status, res.ok))
    }

    const safeFit = (): void => {
      if (!booted || !container.clientWidth || !container.clientHeight) return
      try {
        fit.fit()
      } catch {
        return
      }
      window.companion.resizeTerminal({ cols: term.cols, rows: term.rows })
    }

    const ro = new ResizeObserver(() => {
      boot()
      safeFit()
    })
    ro.observe(container)
    boot() // in case the container is already laid out

    return () => {
      ro.disconnect()
      inputSub?.dispose()
      offData?.()
      offExit?.()
      term.dispose()
    }
    // Mount once; callbacks are stable refs from App.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="terminal-view" ref={containerRef} />
}
