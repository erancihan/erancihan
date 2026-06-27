import { app, protocol, BrowserWindow, shell, ipcMain, dialog, screen, desktopCapturer } from "electron";
import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync, readdirSync, rmSync } from "node:fs";
import { join, delimiter, isAbsolute, resolve, sep, extname, basename, dirname } from "node:path";
import { execFile } from "node:child_process";
import { homedir, platform } from "node:os";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
function parseVersion(raw) {
  const line = raw.trim().split("\n")[0]?.trim();
  return line && /\d+\.\d+/.test(line) ? line : void 0;
}
const INSTALL_GUIDANCE = "Claude Code CLI not found. Install it (https://docs.claude.com/claude-code), then run `claude` once and log in. This app uses your existing Claude Code login — it never needs an Anthropic API key.";
function candidatePaths() {
  const home = homedir();
  const exe = platform() === "win32" ? "claude.exe" : "claude";
  const dirs = [
    join(home, ".local", "bin"),
    join(home, ".claude", "local"),
    "/usr/local/bin",
    "/opt/homebrew/bin"
  ];
  return dirs.map((d) => join(d, exe));
}
function augmentedEnv() {
  const home = homedir();
  const extra = [join(home, ".local", "bin"), "/usr/local/bin", "/opt/homebrew/bin"];
  const current = process.env.PATH ?? "";
  return { ...process.env, PATH: [current, ...extra].filter(Boolean).join(delimiter) };
}
async function tryVersion(command) {
  try {
    const { stdout } = await execFileAsync(command, ["--version"], {
      env: augmentedEnv(),
      timeout: 5e3
    });
    return parseVersion(stdout);
  } catch {
    return void 0;
  }
}
async function detectClaude() {
  const onPath = await tryVersion("claude");
  if (onPath) {
    return { found: true, path: "claude", version: onPath, loggedIn: "unknown" };
  }
  for (const candidate of candidatePaths()) {
    if (!existsSync(candidate)) continue;
    const version = await tryVersion(candidate);
    if (version) {
      return { found: true, path: candidate, version, loggedIn: "unknown" };
    }
  }
  return { found: false, loggedIn: "no", guidance: INSTALL_GUIDANCE };
}
let cachedSpawn = null;
const nodePtySpawn = (file, args, opts) => {
  if (!cachedSpawn) {
    const require3 = createRequire(import.meta.url);
    cachedSpawn = require3("node-pty").spawn;
  }
  return cachedSpawn(file, args, opts);
};
class PtyService {
  /** `spawnFn` is injectable so tests can drive the lifecycle without a real PTY. */
  constructor(spawnFn = nodePtySpawn) {
    this.spawnFn = spawnFn;
  }
  pty = null;
  isRunning() {
    return this.pty !== null;
  }
  start(opts, cb) {
    this.dispose();
    const child = this.spawnFn(opts.command, opts.args ?? [], {
      name: "xterm-color",
      cols: opts.size.cols,
      rows: opts.size.rows,
      cwd: opts.cwd,
      env: this.buildEnv()
    });
    this.pty = child;
    child.onData((data) => cb.onData(data));
    child.onExit(({ exitCode }) => {
      if (this.pty !== child) return;
      this.pty = null;
      cb.onExit(exitCode);
    });
  }
  write(data) {
    this.pty?.write(data);
  }
  resize(size) {
    if (!this.pty) return;
    const cols = Math.max(1, Math.floor(size.cols));
    const rows = Math.max(1, Math.floor(size.rows));
    this.pty.resize(cols, rows);
  }
  dispose() {
    if (!this.pty) return;
    const child = this.pty;
    this.pty = null;
    try {
      child.kill();
    } catch {
    }
  }
  /**
   * Build the child environment. Two deliberate choices:
   *  - Strip ANTHROPIC_API_KEY so the session always runs on the user's Claude Code
   *    login, never a key — matching the plan's "no API key, ever" guarantee (and the
   *    verification step that unsets the key).
   *  - Augment PATH with common bin dirs, since a GUI app launched from Finder/Dock
   *    inherits a sparse PATH that often omits ~/.local/bin where `claude` lives.
   */
  buildEnv() {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const home = homedir();
    const extra = platform() === "win32" ? [] : [join(home, ".local", "bin"), "/usr/local/bin", "/opt/homebrew/bin"];
    env.PATH = [env.PATH ?? "", ...extra].filter(Boolean).join(delimiter);
    env.TERM = env.TERM ?? "xterm-256color";
    return env;
  }
}
const EMOTIONS = [
  "neutral",
  "happy",
  "sad",
  "surprised",
  "angry",
  "excited",
  "thinking"
];
const EMOTION_TAG_INSTRUCTION = "Avatar emotion cues: when your emotional tone shifts, include a single tag from this exact set inline, in square brackets: [neutral] [happy] [sad] [surprised] [angry] [excited] [thinking]. Use only those, sparingly, placed where the tone applies. They drive a companion avatar expression and are stripped from display.";
const TAG_BODY = EMOTIONS.join("|");
function stripEmotionTags(text) {
  const emotions = [];
  const re = new RegExp(`\\[(${TAG_BODY})\\]`, "gi");
  const clean = text.replace(re, (_m, e) => {
    emotions.push(e.toLowerCase());
    return "";
  });
  return { clean, emotions };
}
function buildEmotionPrompt(replyText) {
  const snippet = replyText.slice(-2e3);
  return `Classify the emotional tone of the following assistant message in ONE word, chosen strictly from this list: ${EMOTIONS.join(", ")}. Answer with only that one word, lowercase, no punctuation.

Message:
${snippet}`;
}
function parseEmotion(raw) {
  const words = raw.toLowerCase().match(/[a-z]+/g);
  if (!words) return void 0;
  const set = new Set(EMOTIONS);
  return words.find((w) => set.has(w));
}
function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((block) => {
    if (typeof block === "string") return block;
    if (block && typeof block === "object" && "text" in block) {
      const t = block.text;
      return typeof t === "string" ? t : "";
    }
    return "";
  }).join("").trim();
}
function isAssistant(entry) {
  return entry.type === "assistant" || entry.role === "assistant" || entry.message?.role === "assistant";
}
function extractLastAssistantText(jsonl) {
  const lines = jsonl.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isAssistant(entry)) continue;
    const text = textFromContent(entry.message?.content ?? entry.content);
    if (text) return text;
  }
  return void 0;
}
async function readLastAssistantReply(transcriptPath) {
  try {
    return extractLastAssistantText(await readFile(transcriptPath, "utf8"));
  } catch {
    return void 0;
  }
}
class EmotionService {
  constructor(onEmotion) {
    this.onEmotion = onEmotion;
  }
  current = null;
  claudeCommand = null;
  /** Classify the tone of an already-extracted reply. */
  async classify(text) {
    if (!text) return;
    const command = await this.resolveCommand();
    if (!command) return;
    this.cancel();
    const prompt = buildEmotionPrompt(text);
    const child = execFile(
      command,
      ["-p", prompt, "--output-format", "json", "--model", "haiku"],
      { env: this.buildEnv(), timeout: 2e4, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (this.current === child) this.current = null;
        if (err) return;
        const emotion = this.extractEmotion(stdout);
        if (emotion) this.onEmotion(emotion);
      }
    );
    this.current = child;
  }
  cancel() {
    if (this.current) {
      try {
        this.current.kill();
      } catch {
      }
      this.current = null;
    }
  }
  /** `claude -p --output-format json` prints a JSON object whose `result` holds the text. */
  extractEmotion(stdout) {
    try {
      const parsed = JSON.parse(stdout);
      if (typeof parsed.result === "string") return parseEmotion(parsed.result);
    } catch {
    }
    return parseEmotion(stdout);
  }
  async resolveCommand() {
    if (this.claudeCommand) return this.claudeCommand;
    const status = await detectClaude();
    this.claudeCommand = status.found && status.path ? status.path : null;
    return this.claudeCommand;
  }
  /** Same guarantees as the PTY env: no API key, augmented PATH for GUI launches. */
  buildEnv() {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const extra = platform() === "win32" ? [] : [join(homedir(), ".local", "bin"), "/usr/local/bin", "/opt/homebrew/bin"];
    env.PATH = [env.PATH ?? "", ...extra].filter(Boolean).join(delimiter);
    return env;
  }
}
function defaults() {
  return {
    projectDir: homedir(),
    avatarModel: "placeholder",
    personality: "",
    voice: false,
    mic: false
  };
}
function settingsPath() {
  return join(app.getPath("userData"), "settings.json");
}
function envProjectDir() {
  const raw = process.env.COMPANION_PROJECT_DIR;
  if (!raw) return void 0;
  const dir = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
  try {
    if (statSync(dir).isDirectory()) return dir;
  } catch {
  }
  return void 0;
}
function loadSettings() {
  let stored;
  try {
    stored = { ...defaults(), ...JSON.parse(readFileSync(settingsPath(), "utf8")) };
  } catch {
    stored = defaults();
  }
  const override = envProjectDir();
  return override ? { ...stored, projectDir: override } : stored;
}
function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  const dir = app.getPath("userData");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
function sanitizeTransform(t) {
  if (!t || typeof t !== "object") return void 0;
  const o = t;
  const out = {};
  for (const k of ["scale", "x", "y"]) {
    if (typeof o[k] === "number" && Number.isFinite(o[k])) out[k] = o[k];
  }
  return Object.keys(out).length ? out : void 0;
}
function sanitizeMap(map) {
  if (!map || typeof map !== "object") return void 0;
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return Object.keys(out).length ? out : void 0;
}
function normalizeMeta(id, meta) {
  return {
    name: meta?.name?.trim() || id,
    license: meta?.license?.trim() || void 0,
    author: meta?.author?.trim() || void 0,
    expressionMap: sanitizeMap(meta?.expressionMap),
    motionMap: sanitizeMap(meta?.motionMap),
    transform: sanitizeTransform(meta?.transform)
  };
}
function pickModel3File(filenames) {
  return filenames.find((f) => f.toLowerCase().endsWith(".model3.json"));
}
function parsePersona(raw, id) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  const label = typeof o.label === "string" ? o.label.trim() : "";
  const prompt = typeof o.prompt === "string" ? o.prompt : "";
  if (!label || !prompt.trim()) return null;
  return { id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : id, label, prompt };
}
const MODEL_SCHEME = "companion-model";
function modelUrlFor(id, file) {
  return `${MODEL_SCHEME}://m/models/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
}
function listModels(modelsDir2) {
  if (!existsSync(modelsDir2)) return [];
  const out = [];
  for (const id of readdirSync(modelsDir2)) {
    const dir = join(modelsDir2, id);
    let entries;
    try {
      if (!statSync(dir).isDirectory()) continue;
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    const model3 = pickModel3File(entries);
    if (!model3) continue;
    let meta;
    if (entries.includes("companion.json")) {
      try {
        meta = JSON.parse(readFileSync(join(dir, "companion.json"), "utf8"));
      } catch {
        meta = void 0;
      }
    }
    out.push({ id, ...normalizeMeta(id, meta), modelUrl: modelUrlFor(id, model3) });
  }
  return out;
}
const MIME = {
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".moc3": "application/octet-stream",
  ".exp3": "application/json",
  ".motion3": "application/json",
  ".physics3": "application/json"
};
function contentTypeFor(path) {
  return MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
}
async function serveModelRequest(rootDir, requestUrl) {
  try {
    const rel = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, "");
    const full = join(rootDir, rel);
    const root = rootDir.endsWith(sep) ? rootDir : rootDir + sep;
    if (full !== rootDir && !full.startsWith(root)) {
      return new Response("forbidden", { status: 403 });
    }
    const data = await readFile(full);
    return new Response(new Uint8Array(data), {
      headers: { "content-type": contentTypeFor(full) }
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
function listCustomPersonas(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir)) {
    if (extname(file).toLowerCase() !== ".json") continue;
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
      const persona = parsePersona(raw, basename(file, extname(file)));
      if (persona) out.push(persona);
    } catch {
    }
  }
  return out;
}
function resolveConfigPaths(value, resolve2) {
  if (typeof value === "string") {
    return resolve2(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveConfigPaths(v, resolve2));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveConfigPaths(v, resolve2);
    }
    return out;
  }
  return value;
}
class AsrService {
  constructor(modelDir) {
    this.modelDir = modelDir;
  }
  recognizer = null;
  loadError = null;
  loaded = false;
  status() {
    this.ensureLoaded();
    return {
      available: this.recognizer !== null,
      reason: this.recognizer ? void 0 : this.loadError ?? "No ASR model installed",
      modelDir: this.modelDir
    };
  }
  /** Transcribe a mono PCM utterance. Returns '' on any failure (never throws upstream). */
  async transcribe(samples, sampleRate) {
    this.ensureLoaded();
    if (!this.recognizer) return "";
    try {
      const stream = this.recognizer.createStream();
      stream.acceptWaveform({ sampleRate, samples });
      this.recognizer.decode(stream);
      return (this.recognizer.getResult(stream).text ?? "").trim();
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
      return "";
    }
  }
  ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    const configPath = join(this.modelDir, "config.json");
    if (!existsSync(configPath)) {
      this.loadError = `Drop a sherpa-onnx model + config.json into ${this.modelDir}`;
      return;
    }
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8"));
      const config = resolveConfigPaths(raw, (rel) => {
        const abs = join(this.modelDir, rel);
        return existsSync(abs) ? abs : null;
      });
      const require3 = createRequire(import.meta.url);
      const sherpa = require3("sherpa-onnx-node");
      this.recognizer = new sherpa.OfflineRecognizer(config);
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
      this.recognizer = null;
    }
  }
}
class TtsService {
  constructor(modelDir) {
    this.modelDir = modelDir;
  }
  tts = null;
  loadError = null;
  loaded = false;
  status() {
    this.ensureLoaded();
    return {
      available: this.tts !== null,
      reason: this.tts ? void 0 : this.loadError ?? "No TTS voice installed",
      modelDir: this.modelDir
    };
  }
  /** Synthesize text to mono PCM. Returns null on any failure (renderer then uses Web Speech). */
  synthesize(text) {
    this.ensureLoaded();
    if (!this.tts || !text.trim()) return null;
    try {
      const out = this.tts.generate({ text, sid: 0, speed: 1 });
      return { samples: out.samples, sampleRate: out.sampleRate };
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
      return null;
    }
  }
  ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    const configPath = join(this.modelDir, "config.json");
    if (!existsSync(configPath)) {
      this.loadError = `Drop a sherpa-onnx TTS voice + config.json into ${this.modelDir}`;
      return;
    }
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8"));
      const config = resolveConfigPaths(raw, (rel) => {
        const abs = join(this.modelDir, rel);
        return existsSync(abs) ? abs : null;
      });
      const require3 = createRequire(import.meta.url);
      const sherpa = require3("sherpa-onnx-node");
      this.tts = new sherpa.OfflineTts(config);
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
      this.tts = null;
    }
  }
}
const MANAGED_HOOKS = [
  { event: "UserPromptSubmit" },
  { event: "PreToolUse", matcher: "*" },
  { event: "PostToolUse", matcher: "*" },
  { event: "Notification" },
  { event: "Stop" },
  { event: "SubagentStop", matcher: "*" }
];
function mapEventToCue(signal) {
  const { event, data } = signal;
  switch (event) {
    case "UserPromptSubmit":
      return { pose: "thinking", source: event };
    case "PreToolUse":
    case "PostToolUse":
      return { pose: "working", source: toolSource(event, data) };
    case "Notification":
      return { pose: "alert", source: event, message: messageOf(data) };
    case "Stop":
      return { pose: "idle", source: event };
    case "SubagentStop":
      return { pose: "working", source: event };
    default:
      return null;
  }
}
function toolSource(event, data) {
  const tool = typeof data?.tool_name === "string" ? data.tool_name : void 0;
  return tool ? `${event}:${tool}` : event;
}
function messageOf(data) {
  return typeof data?.message === "string" ? data.message : void 0;
}
const MAX_BODY = 64 * 1024;
class HookBridge {
  constructor(runtimeFile, onCue, onSignal, onSpeak) {
    this.runtimeFile = runtimeFile;
    this.onCue = onCue;
    this.onSignal = onSignal;
    this.onSpeak = onSpeak;
  }
  server = null;
  token = "";
  port = 0;
  async start() {
    if (this.server) return;
    this.token = randomBytes(24).toString("hex");
    const server = createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/cue" && req.url !== "/avatar") {
        res.writeHead(404).end();
        return;
      }
      if (req.headers["x-companion-token"] !== this.token) {
        res.writeHead(403).end();
        return;
      }
      const route = req.url;
      let body = "";
      let tooBig = false;
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > MAX_BODY) {
          tooBig = true;
          res.writeHead(413).end();
          req.destroy();
        }
      });
      req.on("end", () => {
        if (tooBig) return;
        try {
          if (route === "/cue") {
            const signal = JSON.parse(body);
            const cue = mapEventToCue(signal);
            if (cue) this.onCue(cue);
            this.onSignal?.(signal);
          } else {
            const cmd = JSON.parse(body);
            const cue = {};
            if (cmd.pose) cue.pose = cmd.pose;
            if (cmd.expression) cue.expression = cmd.expression;
            if (cmd.message) cue.message = cmd.message;
            cue.source = "mcp";
            if (cue.pose || cue.expression || cue.message) this.onCue(cue);
            if (typeof cmd.speak === "string" && cmd.speak) this.onSpeak?.(cmd.speak);
          }
        } catch {
        }
        res.writeHead(204).end();
      });
    });
    await new Promise((resolve2, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        this.port = typeof addr === "object" && addr ? addr.port : 0;
        resolve2();
      });
    });
    this.server = server;
    writeFileSync(
      this.runtimeFile,
      JSON.stringify({ port: this.port, token: this.token }),
      "utf8"
    );
  }
  stop() {
    this.server?.close();
    this.server = null;
    if (existsSync(this.runtimeFile)) {
      try {
        rmSync(this.runtimeFile);
      } catch {
      }
    }
  }
}
function clone(settings) {
  return JSON.parse(JSON.stringify(settings));
}
function isOurs(entry, scriptPath) {
  return entry.hooks.some((h) => h.command.includes(scriptPath));
}
function countManagedHooks(settings, scriptPath) {
  const hooks = settings.hooks ?? {};
  let n = 0;
  for (const { event } of MANAGED_HOOKS) {
    for (const entry of hooks[event] ?? []) {
      if (isOurs(entry, scriptPath)) n++;
    }
  }
  return n;
}
function addManagedHooks(settings, scriptPath, build) {
  const next = clone(settings);
  const hooks = next.hooks ?? {};
  for (const { event, matcher } of MANAGED_HOOKS) {
    const list = hooks[event] ?? [];
    if (list.some((entry2) => isOurs(entry2, scriptPath))) continue;
    const entry = { hooks: [{ type: "command", command: build(event) }] };
    if (matcher) entry.matcher = matcher;
    hooks[event] = [...list, entry];
  }
  next.hooks = hooks;
  return next;
}
function removeManagedHooks(settings, scriptPath) {
  const next = clone(settings);
  const hooks = next.hooks;
  if (!hooks) return next;
  for (const event of Object.keys(hooks)) {
    const kept = hooks[event].filter((entry) => !isOurs(entry, scriptPath));
    if (kept.length === 0) delete hooks[event];
    else hooks[event] = kept;
  }
  if (Object.keys(hooks).length === 0) delete next.hooks;
  return next;
}
function readSettings(settingsPath2) {
  try {
    return JSON.parse(readFileSync(settingsPath2, "utf8"));
  } catch {
    return {};
  }
}
function writeSettings(settingsPath2, settings) {
  const dir = dirname(settingsPath2);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(settingsPath2, JSON.stringify(settings, null, 2) + "\n", "utf8");
}
function hooksStatus(ctx) {
  try {
    const settings = readSettings(ctx.settingsPath);
    return {
      installed: countManagedHooks(settings, ctx.scriptPath) === MANAGED_HOOKS.length,
      settingsPath: ctx.settingsPath
    };
  } catch (err) {
    return {
      installed: false,
      settingsPath: ctx.settingsPath,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
function installHooks(ctx) {
  try {
    const next = addManagedHooks(readSettings(ctx.settingsPath), ctx.scriptPath, ctx.build);
    writeSettings(ctx.settingsPath, next);
    return { installed: true, settingsPath: ctx.settingsPath };
  } catch (err) {
    return {
      installed: false,
      settingsPath: ctx.settingsPath,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
function uninstallHooks(ctx) {
  try {
    const next = removeManagedHooks(readSettings(ctx.settingsPath), ctx.scriptPath);
    writeSettings(ctx.settingsPath, next);
    return { installed: false, settingsPath: ctx.settingsPath };
  } catch (err) {
    return {
      installed: false,
      settingsPath: ctx.settingsPath,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
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
const pty = new PtyService();
let mainWindow = null;
let bridge = null;
let asr = null;
let tts = null;
function hookScriptPath() {
  return app.isPackaged ? join(process.resourcesPath, "hooks", "cue.mjs") : join(app.getAppPath(), "resources", "hooks", "cue.mjs");
}
function bridgeRuntimeFile() {
  return join(app.getPath("userData"), "companion-bridge.json");
}
function buildSessionArgs(personality) {
  const append = [EMOTION_TAG_INSTRUCTION, personality.trim()].filter(Boolean).join("\n\n");
  return append ? ["--append-system-prompt", append] : [];
}
function resourcesDir() {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "resources");
}
async function captureScreenshot() {
  const wasVisible = mainWindow?.isVisible() ?? false;
  if (wasVisible) mainWindow?.hide();
  await new Promise((r) => setTimeout(r, 200));
  try {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.size;
    const sf = display.scaleFactor || 1;
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: Math.round(width * sf), height: Math.round(height * sf) }
    });
    const primary = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!primary || primary.thumbnail.isEmpty()) return null;
    const dir = join(app.getPath("userData"), "screenshots");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `shot-${Date.now()}.png`);
    writeFileSync(file, primary.thumbnail.toPNG());
    return file;
  } catch {
    return null;
  } finally {
    if (wasVisible) mainWindow?.show();
  }
}
const modelsDir = () => join(resourcesDir(), "models");
const asrDir = () => join(resourcesDir(), "asr");
const ttsDir = () => join(resourcesDir(), "tts");
const personasDir = () => join(resourcesDir(), "personas");
protocol.registerSchemesAsPrivileged([
  {
    scheme: MODEL_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
]);
function installContext() {
  const scriptPath = hookScriptPath();
  const bridgeFile = bridgeRuntimeFile();
  const electron = process.execPath;
  const settingsPath2 = join(loadSettings().projectDir, ".claude", "settings.json");
  return {
    settingsPath: settingsPath2,
    scriptPath,
    build: (event) => `ELECTRON_RUN_AS_NODE=1 "${electron}" "${scriptPath}" --event ${event} --bridge "${bridgeFile}"`
  };
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1e3,
    height: 640,
    minWidth: 720,
    minHeight: 460,
    show: false,
    // Companion look: frameless, transparent, floats above other windows.
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setAlwaysOnTop(true, "floating");
  const grantMedia = (permission) => permission === "media" || permission === "audioCapture" || permission === "microphone";
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_wc, permission, cb) => cb(grantMedia(permission))
  );
  mainWindow.webContents.session.setPermissionCheckHandler(
    (_wc, permission) => grantMedia(permission)
  );
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.webContents.on(
      "console-message",
      (_e, _level, message, line, source) => console.log("[renderer]", message, source ? `(${source}:${line})` : "")
    );
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  const sendToRenderer = (channel, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      mainWindow.webContents.send(channel, payload);
    } catch {
    }
  };
  const emotion = new EmotionService(
    (label) => sendToRenderer(Channels.AvatarCue, { expression: label })
  );
  bridge = new HookBridge(
    bridgeRuntimeFile(),
    (cue) => sendToRenderer(Channels.AvatarCue, cue),
    (signal) => {
      if (signal.event !== "Stop") return;
      const transcript = signal.data?.transcript_path;
      if (typeof transcript !== "string") return;
      void readLastAssistantReply(transcript).then((text) => {
        if (!text) return;
        const { emotions } = stripEmotionTags(text);
        const last = emotions[emotions.length - 1];
        if (last) sendToRenderer(Channels.AvatarCue, { expression: last });
        else void emotion.classify(text);
        sendToRenderer(Channels.AvatarSpeak, text);
      });
    },
    // MCP `say` tool → speak text through the avatar's TTS.
    (text) => sendToRenderer(Channels.AvatarSpeak, text)
  );
  bridge.start().catch((err) => console.error("[bridge] failed to start:", err));
  registerIpc(sendToRenderer);
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(join(import.meta.dirname, "../renderer/index.html"));
  }
}
function registerIpc(send) {
  ipcMain.handle(Channels.CliDetect, () => detectClaude());
  ipcMain.handle(Channels.SettingsGet, () => loadSettings());
  ipcMain.handle(
    Channels.SettingsSet,
    (_e, partial) => saveSettings(partial)
  );
  ipcMain.handle(Channels.TerminalStart, async (_e, size) => {
    const status = await detectClaude();
    if (!status.found || !status.path) {
      return { ok: false, status };
    }
    const settings = loadSettings();
    pty.start(
      {
        command: status.path,
        cwd: settings.projectDir,
        args: buildSessionArgs(settings.personality),
        size
      },
      {
        onData: (data) => send(Channels.TerminalData, data),
        onExit: (code) => send(Channels.TerminalExit, code)
      }
    );
    return { ok: true, status };
  });
  ipcMain.on(Channels.TerminalInput, (_e, data) => pty.write(data));
  ipcMain.on(Channels.TerminalResize, (_e, size) => pty.resize(size));
  ipcMain.on(Channels.AppQuit, () => app.quit());
  ipcMain.handle(Channels.DialogPickDirectory, async () => {
    const opts = {
      title: "Choose start directory",
      defaultPath: loadSettings().projectDir,
      properties: ["openDirectory", "createDirectory"]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, opts) : await dialog.showOpenDialog(opts);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
  ipcMain.handle(Channels.ModelsList, () => listModels(modelsDir()));
  ipcMain.handle(Channels.PersonasList, () => listCustomPersonas(personasDir()));
  ipcMain.handle(Channels.AsrStatus, () => asr?.status());
  ipcMain.handle(
    Channels.AsrTranscribe,
    (_e, payload) => asr?.transcribe(payload.samples, payload.sampleRate) ?? ""
  );
  ipcMain.handle(Channels.TtsStatus, () => tts?.status());
  ipcMain.handle(Channels.TtsSynthesize, (_e, text) => tts?.synthesize(text) ?? null);
  ipcMain.handle(Channels.CaptureScreen, () => captureScreenshot());
  ipcMain.handle(Channels.HooksStatus, () => hooksStatus(installContext()));
  ipcMain.handle(Channels.HooksInstall, () => installHooks(installContext()));
  ipcMain.handle(Channels.HooksUninstall, () => uninstallHooks(installContext()));
}
app.whenReady().then(() => {
  protocol.handle(MODEL_SCHEME, (req) => serveModelRequest(resourcesDir(), req.url));
  asr = new AsrService(asrDir());
  tts = new TtsService(ttsDir());
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  pty.dispose();
  bridge?.stop();
  app.quit();
});
app.on("before-quit", () => {
  pty.dispose();
  bridge?.stop();
});
