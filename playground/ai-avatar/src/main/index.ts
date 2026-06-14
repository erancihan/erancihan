import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { detectClaude } from './cli/detect.js'
import { PtyService } from './cli/ptyService.js'
import { loadSettings, saveSettings } from './settings.js'
import { Channels, type AppSettings, type TerminalSize } from '../shared/ipc.js'

const pty = new PtyService()
let mainWindow: BrowserWindow | null = null

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

  // Forward PTY output and lifecycle to the renderer.
  const sendToRenderer = (channel: string, payload: unknown): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload)
    }
  }

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
      { command: status.path, cwd: settings.projectDir, size },
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
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Single-window companion: closing the window quits the app on every platform
  // (no lingering dock process), and disposing the PTY terminates the claude child.
  pty.dispose()
  app.quit()
})

app.on('before-quit', () => pty.dispose())
