# Swarm extension (Antigravity / VS Code)

The IDE surface — bakes parallel, sandboxed chats into Antigravity.

## What's here

- `extension.ts` — activation; registers the `@swarm` chat participant + commands.
- `lanesPanel.ts` — `LanesViewProvider`: the **Swarm → Lanes** webview sidebar. Renders
  live lanes, streams per-lane output, exposes start / merge / discard.
- `orchestratorFactory.ts` — wires the core engine for the IDE (real worktree+sandbox
  isolation + a `.swarm/journal` store + a lane runner).
- `media/swarm.svg` — activity-bar icon.
- `tsconfig.json` — typecheck config (adds `vscode` + `node` types over the base).

All real work lives in [`../src/core`](../src/core); this layer is a thin host.

## Build & package

```bash
npm run typecheck:ext   # type-check the extension against @types/vscode
npm run bundle:ext      # esbuild -> dist-ext/extension.cjs (vscode external)
npm run package         # bundle + vsce -> swarm.vsix (installable artifact)
```

Install the built `swarm.vsix` in Antigravity via its CLI:

```bash
<antigravity-cli> --install-extension swarm.vsix
```

Publishing to OpenVSX (`ovsx publish`) is the remaining Phase 7 step.

## Status / caveats

- Compiles and **bundles** cleanly; it can only be *run* inside Antigravity (or VS Code).
- Lanes execute via `CliLaneRunner`, which is a **stub** until the Antigravity CLI's
  headless-agent invocation is confirmed (docs/PLAN.md §6 Q2). Swap in
  `ManagedAgentsLaneRunner` to run lanes in cloud sandboxes instead.
- Merge/discard buttons are wired in the webview but the git merge-back is Phase 5.
