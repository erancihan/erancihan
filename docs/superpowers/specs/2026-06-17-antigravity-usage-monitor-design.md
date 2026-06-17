# Antigravity Usage Monitor Extension Design

## Objective
Provide an Antigravity IDE (VS Code based) extension that displays the user's remaining Antigravity usage budget/quota directly in the status bar (footer), including a breakdown of active skills and their token counts.

## Implementation Details

### Manifest (`package.json`)
The extension registers with the IDE and starts on startup:
* **Name**: `antigravity-usage-monitor`
* **Publisher**: `erancihan`
* **Activation Events**: `["*"]` (activates on startup)
* **Main Entrypoint**: `./extension.js`

### Extension Logic (`extension.js`)
* Creates a Status Bar Item aligned to the right side of the status bar.
* Periodically polls the local Go language server at the port indicated by `process.env.ANTIGRAVITY_LS_ADDRESS` (with fallback to `vscode.antigravityUnifiedStateSync`).
* Uses Node's native `http` module to send a `POST /exa.language_server_pb.LanguageServerService/GetTokenBase` request.
* Includes the CSRF token from `process.env.ANTIGRAVITY_CSRF_TOKEN` or unified state sync using the header `x-codeium-csrf-token`.
* Formats the displayed status bar text: `AG Quota: <remaining>/<total>` (e.g. `AG Quota: 15458/20000`).
* Constructs a detailed hover tooltip containing the breakdown of token consumption by active skills.
* Binds a manual refresh trigger to a status bar click.

### Directory Structure
```
/Users/erancihan/W/github.com/erancihan/erancihan/antigravity-usage-monitor/
├── package.json
└── extension.js
```

### Installation
Symlink the extension from the workspace root to `~/.antigravity-ide/extensions/`:
```bash
ln -s "/Users/erancihan/W/github.com/erancihan/erancihan/antigravity-usage-monitor" "/Users/erancihan/.antigravity-ide/extensions/antigravity-usage-monitor"
```

