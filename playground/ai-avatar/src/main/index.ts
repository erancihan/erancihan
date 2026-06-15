import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron'
import { join } from 'node:path'
import { detectClaude } from './cli/detect.js'
import { PtyService } from './cli/ptyService.js'
import { EmotionService, readLastAssistantReply } from './cli/emotion.js'
import { loadSettings, saveSettings } from './settings.js'
import { listModels, MODEL_SCHEME, serveModelRequest } from './models.js'
import { buildPersonalityArgs } from '../shared/models.js'
import { HookBridge } from './hooks/bridge.js'
import type { HookSignal } from '../shared/hookEvents.js'
import {
  hooksStatus,
  installHooks,
  uninstallHooks,
  type InstallContext
} from './hooks/install.js'
import type { HookEvent } from '../shared/hookEvents.js'
import { Channels, type AppSettings, type AvatarCue, type TerminalSize } from '../shared/ipc.js'

const pty = new PtyService()
let mainWindow: BrowserWindow | null = null
let bridge: HookBridge | null = null

/** Absolute path to the bundled hook forwarder (dev vs packaged differ). */
function hookScriptPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'hooks', 'cue.mjs')
    : join(app.getAppPath(), 'resources', 'hooks', 'cue.mjs')
}

/** Runtime file the bridge publishes its live {port, token} to. */
function bridgeRuntimeFile(): string {
  return join(app.getPath('userData'), 'companion-bridge.json')
}

/** Root folder avatar models are discovered + served from (dev vs packaged differ). */
function modelsDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'models')
    : join(app.getAppPath(), 'resources', 'models')
}

// Must run before app `ready`: lets the renderer fetch model files over a port-free,
// app-private scheme (fetch + <img> + streaming), keeping CSP simple.
protocol.registerSchemesAsPrivileged([
  {
    scheme: MODEL_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

/**
 * Build the InstallContext for the CURRENT project dir. The hook command re-runs the
 * Electron binary in Node mode (ELECTRON_RUN_AS_NODE) so it never depends on a system
 * `node` being on Claude Code's PATH.
 */
function installContext(): InstallContext {
  const scriptPath = hookScriptPath()
  const bridgeFile = bridgeRuntimeFile()
  const electron = process.execPath
  const settingsPath = join(loadSettings().projectDir, '.claude', 'settings.json')
  return {
    settingsPath,
    scriptPath,
    build: (event: HookEvent) =>
      `ELECTRON_RUN_AS_NODE=1 "${electron}" "${scriptPath}" --event ${event} --bridge "${bridgeFile}"`
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 640,
    minWidth: 720,
    minHeight: 460,
    show: false,
    // Companion look: frameless, transparent, floats above other windows.
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setAlwaysOnTop(true, 'floating')

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Open target=_blank / external links in the real browser, not a new app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Forward PTY output and lifecycle to the renderer. Wrapped because async senders
  // (the hook bridge, PTY chunks) can fire while the frame is mid-teardown on quit/HMR.
  const sendToRenderer = (channel: string, payload: unknown): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    try {
      mainWindow.webContents.send(channel, payload)
    } catch {
      // Frame disposed between the guard and the send; safe to drop.
    }
  }

  // Emotion agent (Phase 3): on turn end, classify the reply tone via headless `claude -p`
  // and push an expression cue. Async — never blocks the session.
  const emotion = new EmotionService((label) =>
    sendToRenderer(Channels.AvatarCue, { expression: label } as AvatarCue)
  )

  // Start the hook bridge; forward mapped cues to the renderer's avatar, and trigger the
  // emotion classification when a Stop signal carries a transcript path.
  bridge = new HookBridge(
    bridgeRuntimeFile(),
    (cue: AvatarCue) => sendToRenderer(Channels.AvatarCue, cue),
    (signal: HookSignal) => {
      if (signal.event !== 'Stop') return
      const transcript = signal.data?.transcript_path
      if (typeof transcript !== 'string') return
      // Read the reply once, then drive both emotion (claude -p) and TTS off it.
      void readLastAssistantReply(transcript).then((text) => {
        if (!text) return
        void emotion.classify(text)
        sendToRenderer(Channels.AvatarSpeak, text)
      })
    }
  )
  bridge.start().catch((err) => console.error('[bridge] failed to start:', err))

  // Register IPC once the window (and its sender) exist.
  registerIpc(sendToRenderer)

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

function registerIpc(send: (channel: string, payload: unknown) => void): void {
  ipcMain.handle(Channels.CliDetect, () => detectClaude())

  ipcMain.handle(Channels.SettingsGet, () => loadSettings())
  ipcMain.handle(Channels.SettingsSet, (_e, partial: Partial<AppSettings>) =>
    saveSettings(partial)
  )

  ipcMain.handle(Channels.TerminalStart, async (_e, size: TerminalSize) => {
    const status = await detectClaude()
    if (!status.found || !status.path) {
      return { ok: false as const, status }
    }
    const settings = loadSettings()
    pty.start(
      {
        command: status.path,
        cwd: settings.projectDir,
        args: buildPersonalityArgs(settings.personality),
        size
      },
      {
        onData: (data) => send(Channels.TerminalData, data),
        onExit: (code) => send(Channels.TerminalExit, code)
      }
    )
    return { ok: true as const, status }
  })

  ipcMain.on(Channels.TerminalInput, (_e, data: string) => pty.write(data))
  ipcMain.on(Channels.TerminalResize, (_e, size: TerminalSize) => pty.resize(size))

  // Close button → fully quit. before-quit disposes the PTY, terminating claude.
  ipcMain.on(Channels.AppQuit, () => app.quit())

  // Pick the start/working directory for the claude session (returns null if cancelled).
  ipcMain.handle(Channels.DialogPickDirectory, async () => {
    const opts = {
      title: 'Choose start directory',
      defaultPath: loadSettings().projectDir,
      properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[]
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, opts)
      : await dialog.showOpenDialog(opts)
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  // Avatar models discovered under resources/models (Phase 5).
  ipcMain.handle(Channels.ModelsList, () => listModels(modelsDir()))

  // Reaction hooks (Phase 2): scoped to the current project, reversible.
  ipcMain.handle(Channels.HooksStatus, () => hooksStatus(installContext()))
  ipcMain.handle(Channels.HooksInstall, () => installHooks(installContext()))
  ipcMain.handle(Channels.HooksUninstall, () => uninstallHooks(installContext()))
}

app.whenReady().then(() => {
  // Serve model files (model3.json, textures, moc3, …) to the renderer.
  protocol.handle(MODEL_SCHEME, (req) => serveModelRequest(modelsDir(), req.url))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Single-window companion: closing the window quits the app on every platform
  // (no lingering dock process), and disposing the PTY terminates the claude child.
  pty.dispose()
  bridge?.stop()
  app.quit()
})

app.on('before-quit', () => {
  pty.dispose()
  bridge?.stop()
})
