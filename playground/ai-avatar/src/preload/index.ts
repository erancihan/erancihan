import { contextBridge, ipcRenderer } from 'electron'
import {
  Channels,
  type AppSettings,
  type AvatarCue,
  type CliStatus,
  type HooksStatus,
  type TerminalSize
} from '../shared/ipc.js'

/** Result of asking main to start the embedded `claude` session. */
export interface TerminalStartResult {
  ok: boolean
  status: CliStatus
}

/**
 * The safe surface the renderer is allowed to touch. Everything funnels through
 * IPC — the renderer has no direct Node/PTY access (contextIsolation on).
 * Listener registrars return an unsubscribe fn so React effects can clean up.
 */
const api = {
  detectCli: (): Promise<CliStatus> => ipcRenderer.invoke(Channels.CliDetect),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(Channels.SettingsGet),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(Channels.SettingsSet, partial),
  pickDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke(Channels.DialogPickDirectory),

  quit: (): void => ipcRenderer.send(Channels.AppQuit),

  hooksStatus: (): Promise<HooksStatus> => ipcRenderer.invoke(Channels.HooksStatus),
  installHooks: (): Promise<HooksStatus> => ipcRenderer.invoke(Channels.HooksInstall),
  uninstallHooks: (): Promise<HooksStatus> => ipcRenderer.invoke(Channels.HooksUninstall),

  startTerminal: (size: TerminalSize): Promise<TerminalStartResult> =>
    ipcRenderer.invoke(Channels.TerminalStart, size),
  sendInput: (data: string): void => ipcRenderer.send(Channels.TerminalInput, data),
  resizeTerminal: (size: TerminalSize): void =>
    ipcRenderer.send(Channels.TerminalResize, size),

  onTerminalData: (cb: (data: string) => void): (() => void) => {
    const handler = (_e: unknown, data: string): void => cb(data)
    ipcRenderer.on(Channels.TerminalData, handler)
    return () => ipcRenderer.removeListener(Channels.TerminalData, handler)
  },
  onTerminalExit: (cb: (code: number) => void): (() => void) => {
    const handler = (_e: unknown, code: number): void => cb(code)
    ipcRenderer.on(Channels.TerminalExit, handler)
    return () => ipcRenderer.removeListener(Channels.TerminalExit, handler)
  },
  onAvatarCue: (cb: (cue: AvatarCue) => void): (() => void) => {
    const handler = (_e: unknown, cue: AvatarCue): void => cb(cue)
    ipcRenderer.on(Channels.AvatarCue, handler)
    return () => ipcRenderer.removeListener(Channels.AvatarCue, handler)
  }
}

export type CompanionApi = typeof api

contextBridge.exposeInMainWorld('companion', api)
