# Reaction hooks

`cue.mjs` is the forwarder the companion installs into Claude Code's hook config. Claude
Code runs it on each event (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
`Notification`, `Stop`, `SubagentStop`); it reads the event JSON from stdin and POSTs a
small cue to the app's local bridge, which moves the avatar (listen / think / work / idle
/ alert).

Design guarantees:
- **Stable config, rotating endpoint.** The installed command points at this script with
  the bridge *runtime file* path baked in. The live port + token rotate each app launch
  and are written to that file (`userData/companion-bridge.json`); the script reads it at
  runtime, so hook config never goes stale.
- **Safe when the app is closed.** No runtime file or unreachable bridge → the script
  no-ops and exits 0. It never blocks or fails a Claude Code session.
- **Silent.** It prints nothing to stdout (stdout from a `UserPromptSubmit` hook would be
  injected into the prompt).
- **Run via Electron-as-Node** (`ELECTRON_RUN_AS_NODE=1`), so it doesn't depend on a
  system `node` being on Claude Code's PATH.

Install/remove from the app: the ⚡ button in the title bar. Hooks are written to
`<projectDir>/.claude/settings.json`, tagged by this script's path, and removed precisely
on uninstall — pre-existing hooks are preserved. After installing, restart the session so
Claude Code picks up the new config.
