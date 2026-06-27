import { contextBridge, ipcRenderer } from "electron";
const Channels = {
  // main -> renderer (events)
  TerminalData: "terminal:data",
  TerminalExit: "terminal:exit",
  AvatarCue: "avatar:cue",
  AvatarSpeak: "avatar:speak",
  // renderer -> main (invocations)
  CliDetect: "cli:detect",
  TerminalStart: "terminal:start",
  TerminalInput: "terminal:input",
  TerminalResize: "terminal:resize",
  SettingsGet: "settings:get",
  SettingsSet: "settings:set",
  AppQuit: "app:quit",
  HooksStatus: "hooks:status",
  HooksInstall: "hooks:install",
  HooksUninstall: "hooks:uninstall",
  DialogPickDirectory: "dialog:pickDirectory",
  ModelsList: "models:list",
  PersonasList: "personas:list",
  AsrStatus: "asr:status",
  AsrTranscribe: "asr:transcribe",
  TtsStatus: "tts:status",
  TtsSynthesize: "tts:synthesize",
  CaptureScreen: "capture:screen"
};
const api = {
  detectCli: () => ipcRenderer.invoke(Channels.CliDetect),
  getSettings: () => ipcRenderer.invoke(Channels.SettingsGet),
  setSettings: (partial) => ipcRenderer.invoke(Channels.SettingsSet, partial),
  pickDirectory: () => ipcRenderer.invoke(Channels.DialogPickDirectory),
  listModels: () => ipcRenderer.invoke(Channels.ModelsList),
  listPersonas: () => ipcRenderer.invoke(Channels.PersonasList),
  asrStatus: () => ipcRenderer.invoke(Channels.AsrStatus),
  transcribe: (samples, sampleRate) => ipcRenderer.invoke(Channels.AsrTranscribe, { samples, sampleRate }),
  ttsStatus: () => ipcRenderer.invoke(Channels.TtsStatus),
  synthesize: (text) => ipcRenderer.invoke(Channels.TtsSynthesize, text),
  captureScreen: () => ipcRenderer.invoke(Channels.CaptureScreen),
  quit: () => ipcRenderer.send(Channels.AppQuit),
  hooksStatus: () => ipcRenderer.invoke(Channels.HooksStatus),
  installHooks: () => ipcRenderer.invoke(Channels.HooksInstall),
  uninstallHooks: () => ipcRenderer.invoke(Channels.HooksUninstall),
  startTerminal: (size) => ipcRenderer.invoke(Channels.TerminalStart, size),
  sendInput: (data) => ipcRenderer.send(Channels.TerminalInput, data),
  resizeTerminal: (size) => ipcRenderer.send(Channels.TerminalResize, size),
  onTerminalData: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on(Channels.TerminalData, handler);
    return () => ipcRenderer.removeListener(Channels.TerminalData, handler);
  },
  onTerminalExit: (cb) => {
    const handler = (_e, code) => cb(code);
    ipcRenderer.on(Channels.TerminalExit, handler);
    return () => ipcRenderer.removeListener(Channels.TerminalExit, handler);
  },
  onAvatarCue: (cb) => {
    const handler = (_e, cue) => cb(cue);
    ipcRenderer.on(Channels.AvatarCue, handler);
    return () => ipcRenderer.removeListener(Channels.AvatarCue, handler);
  },
  onAvatarSpeak: (cb) => {
    const handler = (_e, text) => cb(text);
    ipcRenderer.on(Channels.AvatarSpeak, handler);
    return () => ipcRenderer.removeListener(Channels.AvatarSpeak, handler);
  }
};
contextBridge.exposeInMainWorld("companion", api);
