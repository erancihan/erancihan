const vscode = require('vscode');
const http = require('http');
const https = require('https');

function makeRequest(protocol, options, postData) {
    return new Promise((resolve, reject) => {
        const reqLib = protocol === 'https' ? https : http;
        const reqOptions = { ...options };
        if (protocol === 'https') {
            reqOptions.rejectUnauthorized = false;
        }
        const req = reqLib.request(reqOptions, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, headers: res.headers, body });
            });
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.write(postData);
        req.end();
    });
}

function formatRefreshTime(resetTimeStr) {
    if (!resetTimeStr) return "";
    const resetTime = new Date(resetTimeStr);
    if (isNaN(resetTime.getTime()) || resetTime <= new Date()) return "";

    const diffMs = resetTime.getTime() - Date.now();
    const diffMins = Math.floor(diffMs / 60000);
    const days = Math.floor(diffMins / 1440);
    const hours = Math.floor((diffMins % 1440) / 60);
    const mins = diffMins % 60;

    if (days > 0) {
        return `Refreshes in ${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours > 1 ? "s" : ""}`;
    } else if (hours > 0) {
        return `Refreshes in ${hours} hour${hours > 1 ? "s" : ""}, ${mins} minute${mins > 1 ? "s" : ""}`;
    } else if (mins > 0) {
        return `Refreshes in ${mins} minute${mins > 1 ? "s" : ""}`;
    } else {
        return "Refreshes in <1 minute";
    }
}

const DEFAULT_GROUPS = {
    premium: {
        name: "Premium",
        icon: "$(sparkle)",
        priority: 102
    },
    gemini: {
        name: "Gemini",
        icon: "$(zap)",
        priority: 101
    },
    tab: {
        name: "Tab",
        icon: "$(code)",
        priority: 100
    }
};

const DEFAULT_MODEL_ASSIGNMENTS = {
    "claude-opus-4-6-thinking": "premium",
    "claude-sonnet-4-6": "premium",
    "gpt-oss-120b-medium": "premium",
    "gemini-2.5-flash": "gemini",
    "gemini-2.5-flash-lite": "gemini",
    "gemini-2.5-flash-thinking": "gemini",
    "gemini-2.5-pro": "gemini",
    "gemini-3-flash": "gemini",
    "gemini-3-flash-agent": "gemini",
    "gemini-3.1-flash-image": "gemini",
    "gemini-3.1-flash-lite": "gemini",
    "gemini-3.1-pro-high": "gemini",
    "gemini-3.1-pro-low": "gemini",
    "gemini-3.5-flash-extra-low": "gemini",
    "gemini-3.5-flash-low": "gemini",
    "gemini-pro-agent": "gemini",
    "tab_flash_lite_preview": "tab",
    "tab_jump_flash_lite_preview": "tab",
    "chat_20706": "tab",
    "chat_23310": "tab"
};

function getCustomConfig(context) {
    let config = context.globalState.get('antigravityUsageMonitorConfig');
    if (!config) {
        config = {
            groups: { ...DEFAULT_GROUPS },
            modelAssignments: { ...DEFAULT_MODEL_ASSIGNMENTS }
        };
    }
    return JSON.parse(JSON.stringify(config));
}

function saveCustomConfig(context, config) {
    return context.globalState.update('antigravityUsageMonitorConfig', config);
}

function getModelPoolKey(modelId, config) {
    const assignments = config.modelAssignments || {};
    const lowerModelId = modelId.toLowerCase();
    const assignedKey = Object.keys(assignments).find(k => k.toLowerCase() === lowerModelId);
    if (assignedKey !== undefined) {
        return assignments[assignedKey] || 'other';
    }
    if (lowerModelId.includes('gemini')) return 'gemini';
    if (lowerModelId.includes('claude') || lowerModelId.includes('gpt')) return 'premium';
    if (lowerModelId.includes('tab') || lowerModelId.includes('chat')) return 'tab';
    return 'other';
}

function getWebviewContent(config, availableModels) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configure Quota Groups</title>
    <style>
        body {
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
            font-size: var(--vscode-font-size, 13px);
            padding: 20px;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
        }
        h2 {
            margin-top: 0;
            margin-bottom: 15px;
            color: var(--vscode-settings-headerForeground, #ffffff);
            font-weight: 600;
        }
        .container {
            display: flex;
            flex: 1;
            gap: 24px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .column {
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: var(--vscode-welcomePage-tileBackground, rgba(255, 255, 255, 0.02));
            border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
            border-radius: 8px;
            padding: 20px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .scrollable {
            flex: 1;
            overflow-y: auto;
            padding-right: 8px;
        }
        .scrollable::-webkit-scrollbar {
            width: 8px;
        }
        .scrollable::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
            border-radius: 4px;
        }
        .scrollable::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background, rgba(255, 255, 255, 0.2));
            border-radius: 4px;
        }
        .scrollable::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground, rgba(255, 255, 255, 0.3));
        }
        .card {
            background-color: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.04));
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 12px;
            position: relative;
            transition: all 0.2s ease;
        }
        .card:hover {
            border-color: var(--vscode-focusBorder, #007acc);
            background-color: rgba(255, 255, 255, 0.06);
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 10px;
        }
        .form-group {
            display: flex;
            flex-direction: column;
        }
        label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            opacity: 0.8;
        }
        input, select {
            background-color: var(--vscode-input-background, #3c3c3c);
            color: var(--vscode-input-foreground, #cccccc);
            border: 1px solid var(--vscode-input-border, transparent);
            padding: 6px 10px;
            border-radius: 4px;
            font-family: inherit;
            font-size: inherit;
        }
        input:focus, select:focus {
            outline: 1px solid var(--vscode-focusBorder, #007acc);
            border-color: var(--vscode-focusBorder, #007acc);
        }
        .btn {
            background-color: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #ffffff);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease;
        }
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground, #0062a3);
        }
        .btn-danger {
            background-color: var(--vscode-errorForeground, #f48771);
            color: #ffffff;
            padding: 4px 8px;
            font-size: 11px;
        }
        .btn-danger:hover {
            background-color: #d76c57;
        }
        .delete-btn-container {
            position: absolute;
            top: 12px;
            right: 16px;
        }
        .search-bar {
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 15px;
            padding: 8px 12px;
        }
        .model-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: background-color 0.2s ease;
        }
        .model-row:hover {
            background-color: rgba(255, 255, 255, 0.03);
        }
        .model-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .model-id {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
            opacity: 0.9;
        }
        .model-display-name {
            font-size: 11px;
            opacity: 0.6;
        }
        .footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            border-top: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
            padding-top: 15px;
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground, #3a3d41);
            color: var(--vscode-button-secondaryForeground, #ffffff);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground, #4c5054);
        }
    </style>
</head>
<body>
    <h2>Antigravity Quota: Configure Groups</h2>
    <div class="container">
        <div class="column">
            <div class="header-row">
                <h2>Quota Groups</h2>
                <button class="btn" id="add-group-btn">+ Add Group</button>
            </div>
            <div class="scrollable" id="groups-list"></div>
        </div>

        <div class="column">
            <div class="header-row">
                <h2>Model Assignments</h2>
            </div>
            <input type="text" class="search-bar" id="model-search" placeholder="Search models by name or ID...">
            <div class="scrollable" id="models-list"></div>
        </div>
    </div>
    <div class="footer">
        <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn" id="save-btn">Save Configuration</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let config = ${JSON.stringify(config)};
        let availableModels = ${JSON.stringify(availableModels)};
        let filterText = "";

        const groupsListEl = document.getElementById('groups-list');
        const modelsListEl = document.getElementById('models-list');
        const modelSearchEl = document.getElementById('model-search');
        const addGroupBtnEl = document.getElementById('add-group-btn');
        const saveBtnEl = document.getElementById('save-btn');
        const cancelBtnEl = document.getElementById('cancel-btn');

        function renderGroups() {
            groupsListEl.innerHTML = '';
            Object.keys(config.groups).forEach(key => {
                const group = config.groups[key];
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = 
                    '<div class="delete-btn-container">' +
                        '<button class="btn btn-danger delete-group-btn" data-key="' + key + '">Delete</button>' +
                    '</div>' +
                    '<div style="font-weight: 600; margin-bottom: 8px; display:flex; align-items:center; gap: 8px;">' +
                        '<span style="opacity:0.5; font-size:11px; font-family:monospace;">ID: ' + key + '</span>' +
                    '</div>' +
                    '<div class="form-grid">' +
                        '<div class="form-group">' +
                            '<label>Display Name</label>' +
                            '<input type="text" class="group-name-input" data-key="' + key + '" value="' + group.name + '">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label>Icon (e.g. $(zap))</label>' +
                            '<input type="text" class="group-icon-input" data-key="' + key + '" value="' + (group.icon || '') + '">' +
                        '</div>' +
                        '<div class="form-group">' +
                            '<label>Priority</label>' +
                            '<input type="number" class="group-priority-input" data-key="' + key + '" value="' + group.priority + '">' +
                        '</div>' +
                    '</div>';
                groupsListEl.appendChild(card);
            });

            document.querySelectorAll('.group-name-input').forEach(el => {
                el.addEventListener('input', (e) => {
                    const key = e.target.getAttribute('data-key');
                    config.groups[key].name = e.target.value;
                });
            });
            document.querySelectorAll('.group-icon-input').forEach(el => {
                el.addEventListener('input', (e) => {
                    const key = e.target.getAttribute('data-key');
                    config.groups[key].icon = e.target.value;
                });
            });
            document.querySelectorAll('.group-priority-input').forEach(el => {
                el.addEventListener('input', (e) => {
                    const key = e.target.getAttribute('data-key');
                    config.groups[key].priority = parseInt(e.target.value, 10) || 0;
                });
            });
            document.querySelectorAll('.delete-group-btn').forEach(el => {
                el.addEventListener('click', (e) => {
                    const key = e.target.getAttribute('data-key');
                    delete config.groups[key];
                    Object.keys(config.modelAssignments).forEach(mId => {
                        if (config.modelAssignments[mId] === key) {
                            config.modelAssignments[mId] = "";
                        }
                    });
                    renderGroups();
                    renderModels();
                });
            });
        }

        function renderModels() {
            modelsListEl.innerHTML = '';
            const filteredModels = Object.keys(availableModels).filter(modelId => {
                const model = availableModels[modelId];
                const displayName = model.displayName || "";
                return modelId.toLowerCase().includes(filterText.toLowerCase()) || 
                       displayName.toLowerCase().includes(filterText.toLowerCase());
            });

            if (filteredModels.length === 0) {
                modelsListEl.innerHTML = '<div style="padding: 20px; opacity:0.5; text-align:center;">No models found.</div>';
                return;
            }

            filteredModels.forEach(modelId => {
                const model = availableModels[modelId];
                const displayName = model.displayName || modelId;
                const currentGroupId = config.modelAssignments[modelId] || "";

                let optionsHtml = '<option value="">(Unassigned / Auto)</option>';
                Object.keys(config.groups).forEach(gKey => {
                    const g = config.groups[gKey];
                    const selected = currentGroupId === gKey ? 'selected' : '';
                    optionsHtml += '<option value="' + gKey + '" ' + selected + '>' + g.name + '</option>';
                });

                const row = document.createElement('div');
                row.className = 'model-row';
                row.innerHTML = 
                    '<div class="model-info">' +
                        '<span class="model-id">' + modelId + '</span>' +
                        '<span class="model-display-name">' + displayName + '</span>' +
                    '</div>' +
                    '<div>' +
                        '<select class="model-group-select" data-model-id="' + modelId + '">' +
                            optionsHtml +
                        '</select>' +
                    '</div>';
                modelsListEl.appendChild(row);
            });

            document.querySelectorAll('.model-group-select').forEach(el => {
                el.addEventListener('change', (e) => {
                    const mId = e.target.getAttribute('data-model-id');
                    const val = e.target.value;
                    config.modelAssignments[mId] = val;
                });
            });
        }

        addGroupBtnEl.addEventListener('click', () => {
            const rawId = prompt("Enter a unique ID for the new group (alphanumeric, e.g. premium, flash, low):");
            if (!rawId) return;
            const key = rawId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
            if (!key) {
                alert("Invalid group ID.");
                return;
            }
            if (config.groups[key]) {
                alert("A group with this ID already exists.");
                return;
            }

            config.groups[key] = {
                name: rawId.trim(),
                icon: "$(sparkle)",
                priority: 100
            };
            renderGroups();
            renderModels();
        });

        modelSearchEl.addEventListener('input', (e) => {
            filterText = e.target.value;
            renderModels();
        });

        saveBtnEl.addEventListener('click', () => {
            vscode.postMessage({
                command: 'save',
                config: config
            });
        });

        cancelBtnEl.addEventListener('click', () => {
            vscode.postMessage({
                command: 'cancel'
            });
        });

        renderGroups();
        renderModels();
    </script>
</body>
</html>`;
}

function activate(context) {
    const statusBarItems = new Map();
    let generalStatusItem = null;
    let cachedModels = {};

    function showGeneralStatus(text, tooltip) {
        for (const item of statusBarItems.values()) {
            item.hide();
        }
        
        if (!generalStatusItem) {
            generalStatusItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Right,
                103
            );
            generalStatusItem.name = "Antigravity Usage Monitor";
            generalStatusItem.command = "antigravity-usage-monitor.showMenu";
            context.subscriptions.push(generalStatusItem);
        }
        generalStatusItem.text = text;
        generalStatusItem.tooltip = tooltip;
        generalStatusItem.show();
    }

    function hideGeneralStatus() {
        if (generalStatusItem) {
            generalStatusItem.hide();
        }
    }

    showGeneralStatus("$(sparkle) ...", "Click to refresh quota");

    async function getCredentials() {
        let host = "localhost";
        let port = 64038;
        let csrfToken = process.env.ANTIGRAVITY_CSRF_TOKEN;

        const lsAddress = process.env.ANTIGRAVITY_LS_ADDRESS;
        if (lsAddress) {
            const parts = lsAddress.split(":");
            host = parts[0] || "localhost";
            port = parseInt(parts[1], 10) || 64038;
        }

        if (!csrfToken && vscode.antigravityUnifiedStateSync && vscode.antigravityUnifiedStateSync.LsClientMachineInfos) {
            try {
                const infos = await vscode.antigravityUnifiedStateSync.LsClientMachineInfos.getLsClientMachineInfos();
                const localInfo = infos.find(info => info.resource === "");
                if (localInfo) {
                    csrfToken = localInfo.csrfToken;
                    host = localInfo.host || "localhost";
                    port = localInfo.port || 64038;
                }
            } catch (e) {
                console.error("Failed to read from unified state sync:", e);
            }
        }
        return { host, port, csrfToken };
    }

    async function updateQuota() {
        const { host, port, csrfToken } = await getCredentials();
        if (!csrfToken) {
            showGeneralStatus("AG Quota: No Token", "ANTIGRAVITY_CSRF_TOKEN not found in environment or state sync.");
            return;
        }

        const postData = JSON.stringify({});
        const options = {
            hostname: host,
            port: port,
            path: '/exa.language_server_pb.LanguageServerService/GetAvailableModels',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-codeium-csrf-token': csrfToken,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        let response;
        try {
            response = await makeRequest('https', options, postData);
            if (response.statusCode === 400) {
                response = await makeRequest('http', options, postData);
            }
        } catch (e) {
            try {
                response = await makeRequest('http', options, postData);
            } catch (httpError) {
                showGeneralStatus("AG Quota: Offline", `Failed to connect to language server:\nHTTPS: ${e.message}\nHTTP: ${httpError.message}`);
                return;
            }
        }

        const { statusCode, body } = response;
        if (statusCode === 200) {
            try {
                const rawData = JSON.parse(body);
                const data = rawData.response || {};
                const models = data.models || {};
                cachedModels = models;

                hideGeneralStatus();

                const currentConfig = getCustomConfig(context);
                const groupsConfig = currentConfig.groups;

                const pools = {};
                Object.keys(models).forEach(modelId => {
                    const model = models[modelId];
                    if (!model.quotaInfo) return;
                    
                    const poolKey = getModelPoolKey(modelId, currentConfig);
                    if (poolKey === 'other' || !groupsConfig[poolKey]) return;
                    
                    if (!pools[poolKey]) {
                        pools[poolKey] = {
                            models: [],
                            remainingFraction: 1.0,
                            resetTime: null
                        };
                    }
                    pools[poolKey].models.push(model);
                    if (model.quotaInfo.remainingFraction !== undefined) {
                        pools[poolKey].remainingFraction = Math.min(pools[poolKey].remainingFraction, model.quotaInfo.remainingFraction);
                    }
                    if (model.quotaInfo.resetTime) {
                        pools[poolKey].resetTime = model.quotaInfo.resetTime;
                    }
                });

                const updatedKeys = new Set();
                Object.keys(pools).forEach(poolKey => {
                    const pool = pools[poolKey];
                    const configData = groupsConfig[poolKey] || {};
                    const name = configData.name || poolKey;
                    const icon = configData.icon || "$(sparkle)";
                    const priority = configData.priority !== undefined ? configData.priority : 100;
                    const percentage = Math.round(pool.remainingFraction * 100);
                    
                    let item = statusBarItems.get(poolKey);
                    if (!item) {
                        item = vscode.window.createStatusBarItem(
                            vscode.StatusBarAlignment.Right,
                            priority
                        );
                        item.command = "antigravity-usage-monitor.showMenu";
                        context.subscriptions.push(item);
                        statusBarItems.set(poolKey, item);
                    }
                    item.name = `Antigravity Usage - ${name}`;

                    let tooltipText = `${name} Model Quota\nRemaining: ${percentage}%\n`;
                    if (pool.resetTime) {
                        const refreshText = formatRefreshTime(pool.resetTime);
                        if (refreshText) {
                            tooltipText += `Refreshes in: ${refreshText}\n`;
                        }
                        tooltipText += `Reset Time: ${new Date(pool.resetTime).toLocaleString()}\n`;
                    }
                    tooltipText += `\nModels:\n`;
                    pool.models.forEach(m => {
                        const displayName = m.displayName || m.model || "Unknown";
                        tooltipText += `- ${displayName}\n`;
                    });

                    item.text = `${icon} ${name}: ${percentage}%`;
                    item.tooltip = tooltipText.trim();
                    item.show();
                    updatedKeys.add(poolKey);
                });

                for (const [key, item] of statusBarItems.entries()) {
                    if (!updatedKeys.has(key)) {
                        item.hide();
                    }
                }
            } catch (e) {
                showGeneralStatus("AG Quota: Parse Error", `Error parsing response: ${e.message}\nResponse: ${body}`);
            }
        } else {
            showGeneralStatus("AG Quota: Error", `Server returned status ${statusCode}\nBody: ${body}`);
        }
    }

    const refreshCmd = vscode.commands.registerCommand('antigravity-usage-monitor.refresh', () => {
        updateQuota();
    });
    context.subscriptions.push(refreshCmd);

    const configureCmd = vscode.commands.registerCommand('antigravity-usage-monitor.configureGroups', () => {
        const configPanel = vscode.window.createWebviewPanel(
            'configureGroups',
            'Configure Quota Groups',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const currentConfig = getCustomConfig(context);
        configPanel.webview.html = getWebviewContent(currentConfig, cachedModels);

        configPanel.webview.onDidReceiveMessage(message => {
            if (message.command === 'save') {
                saveCustomConfig(context, message.config).then(() => {
                    // Dispose current group items to avoid orphan status bar items on key changes
                    for (const item of statusBarItems.values()) {
                        item.dispose();
                    }
                    statusBarItems.clear();
                    updateQuota();
                    vscode.window.showInformationMessage("Quota groups configuration saved.");
                    configPanel.dispose();
                });
            } else if (message.command === 'cancel') {
                configPanel.dispose();
            }
        });
    });
    context.subscriptions.push(configureCmd);

    const showMenuCmd = vscode.commands.registerCommand('antigravity-usage-monitor.showMenu', async () => {
        const choice = await vscode.window.showQuickPick([
            { label: "$(sync) Refresh Quota", id: "refresh" },
            { label: "$(gear) Configure Groups (UI)", id: "configure" }
        ], {
            placeHolder: "Antigravity Quota Menu"
        });

        if (choice) {
            if (choice.id === "refresh") {
                updateQuota();
            } else if (choice.id === "configure") {
                vscode.commands.executeCommand("antigravity-usage-monitor.configureGroups");
            }
        }
    });
    context.subscriptions.push(showMenuCmd);

    updateQuota();
    const interval = setInterval(updateQuota, 10000);
    context.subscriptions.push({
        dispose: () => {
            clearInterval(interval);
            for (const item of statusBarItems.values()) {
                item.dispose();
            }
            if (generalStatusItem) {
                generalStatusItem.dispose();
            }
        }
    });
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
};
