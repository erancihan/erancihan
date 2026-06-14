import { execFile, type ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { delimiter, join } from 'node:path'
import { detectClaude } from './detect.js'
import {
  buildEmotionPrompt,
  extractLastAssistantText,
  parseEmotion,
  type Emotion
} from '../../shared/emotion.js'

/**
 * Classifies the emotional tone of the last assistant reply by running a short headless
 * `claude -p` on the same Claude Code login (no API key). Fully async and cancelable so it
 * NEVER delays the interactive session: it kicks off after the Stop hook fires, and a new
 * request cancels any in-flight one. Any failure is a silent no-op (the avatar simply keeps
 * its current expression).
 */
export class EmotionService {
  private current: ChildProcess | null = null
  private claudeCommand: string | null = null

  constructor(private readonly onEmotion: (emotion: Emotion) => void) {}

  /** Read the transcript's last assistant message and classify its tone. */
  async classifyFromTranscript(transcriptPath: string): Promise<void> {
    let text: string | undefined
    try {
      text = extractLastAssistantText(await readFile(transcriptPath, 'utf8'))
    } catch {
      return // transcript unreadable — skip
    }
    if (!text) return

    const command = await this.resolveCommand()
    if (!command) return

    // Cancel any classification still running from a previous turn.
    this.cancel()

    const prompt = buildEmotionPrompt(text)
    const child = execFile(
      command,
      ['-p', prompt, '--output-format', 'json', '--model', 'haiku'],
      { env: this.buildEnv(), timeout: 20_000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (this.current === child) this.current = null
        if (err) return // timeout / non-zero exit / killed — no-op
        const emotion = this.extractEmotion(stdout)
        if (emotion) this.onEmotion(emotion)
      }
    )
    this.current = child
  }

  cancel(): void {
    if (this.current) {
      try {
        this.current.kill()
      } catch {
        // already gone
      }
      this.current = null
    }
  }

  /** `claude -p --output-format json` prints a JSON object whose `result` holds the text. */
  private extractEmotion(stdout: string): Emotion | undefined {
    try {
      const parsed = JSON.parse(stdout) as { result?: unknown }
      if (typeof parsed.result === 'string') return parseEmotion(parsed.result)
    } catch {
      // Not JSON (older CLI / text mode) — fall back to scanning the raw output.
    }
    return parseEmotion(stdout)
  }

  private async resolveCommand(): Promise<string | null> {
    if (this.claudeCommand) return this.claudeCommand
    const status = await detectClaude()
    this.claudeCommand = status.found && status.path ? status.path : null
    return this.claudeCommand
  }

  /** Same guarantees as the PTY env: no API key, augmented PATH for GUI launches. */
  private buildEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env }
    delete env.ANTHROPIC_API_KEY
    const extra =
      platform() === 'win32'
        ? []
        : [join(homedir(), '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin']
    env.PATH = [env.PATH ?? '', ...extra].filter(Boolean).join(delimiter)
    return env
  }
}
