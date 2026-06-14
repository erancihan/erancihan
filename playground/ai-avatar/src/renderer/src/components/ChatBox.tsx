import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface ChatBoxProps {
  /** Fired when the user sends a line, so App can nudge the avatar pose. */
  onSend: () => void
}

/**
 * The avatar's chat box. It does NOT talk to a separate model — it writes straight to
 * the same PTY stdin as the terminal, so chatting with the character and typing in the
 * terminal drive one shared Claude Code session (the plan's "two surfaces, one session").
 */
export function ChatBox({ onSend }: ChatBoxProps): JSX.Element {
  const [text, setText] = useState('')

  const send = (): void => {
    const line = text.trim()
    if (!line) return
    // Carriage return submits the line to the interactive CLI.
    window.companion.sendInput(line + '\r')
    setText('')
    onSend()
  }

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault()
    send()
  }

  // Enter sends; Shift+Enter inserts a newline for multi-line prompts.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <form className="chatbox" onSubmit={onSubmit}>
      <textarea
        className="chatbox-input"
        placeholder="say something to your companion…"
        value={text}
        rows={1}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button className="chatbox-send" type="submit" aria-label="send">
        ↵
      </button>
    </form>
  )
}
