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

function activate(context) {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.name = "Antigravity Usage Monitor";
    statusBarItem.text = "$(sparkle) ...";
    statusBarItem.tooltip = "Click to refresh quota";
    statusBarItem.command = "antigravity-usage-monitor.refresh";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

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

        // Fallback to unified state sync if available and env vars are missing
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
            statusBarItem.text = "AG Quota: No Token";
            statusBarItem.tooltip = "ANTIGRAVITY_CSRF_TOKEN not found in environment or state sync.";
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
                statusBarItem.text = "AG Quota: Offline";
                statusBarItem.tooltip = `Failed to connect to language server:\nHTTPS: ${e.message}\nHTTP: ${httpError.message}`;
                return;
            }
        }

        const { statusCode, body } = response;
        if (statusCode === 200) {
            try {
                const rawData = JSON.parse(body);
                const data = rawData.response || {};
                const models = data.models || {};
                const defaultModelId = data.defaultAgentModelId;
                const agentModelSorts = data.agentModelSorts || [];

                // Find recommended model IDs
                const recommendedModelIds = [];
                if (agentModelSorts.length > 0) {
                    agentModelSorts.forEach(sort => {
                        if (sort.groups) {
                            sort.groups.forEach(group => {
                                if (group.modelIds) {
                                    group.modelIds.forEach(id => {
                                        if (!recommendedModelIds.includes(id)) {
                                            recommendedModelIds.push(id);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

                // If no sorts exist, fallback to all models
                if (recommendedModelIds.length === 0) {
                    Object.keys(models).forEach(id => recommendedModelIds.push(id));
                }

                // Identify active model & percentage
                let activePercentage = 100;
                let activeModelName = "Unknown";
                let activeModelId = defaultModelId;

                if (!activeModelId || !models[activeModelId]) {
                    // Fallback to first available model ID
                    activeModelId = Object.keys(models)[0];
                }

                if (activeModelId && models[activeModelId]) {
                    const activeModel = models[activeModelId];
                    activeModelName = activeModel.displayName || activeModelId;
                    if (activeModel.quotaInfo && activeModel.quotaInfo.remainingFraction !== undefined) {
                        activePercentage = Math.round(activeModel.quotaInfo.remainingFraction * 100);
                    }
                }

                statusBarItem.text = `$(sparkle) ${activePercentage}%`;

                // Build Model Quota Tooltip
                let tooltipText = `Model Quota\nActive Model: ${activeModelName} (${activePercentage}% remaining)\n\nBreakdown:\n`;
                recommendedModelIds.forEach(id => {
                    const model = models[id];
                    if (model) {
                        const name = model.displayName || id;
                        let quotaStr = "Unable to determine quota";
                        let refreshStr = "";
                        if (model.quotaInfo) {
                            if (model.quotaInfo.remainingFraction !== undefined) {
                                quotaStr = `${Math.round(model.quotaInfo.remainingFraction * 100)}% remaining`;
                            }
                            if (model.quotaInfo.resetTime) {
                                const refreshText = formatRefreshTime(model.quotaInfo.resetTime);
                                if (refreshText) {
                                    refreshStr = ` (${refreshText})`;
                                }
                            }
                        }
                        tooltipText += `- ${name}: ${quotaStr}${refreshStr}\n`;
                    }
                });
                statusBarItem.tooltip = tooltipText.trim();
            } catch (e) {
                statusBarItem.text = "AG Quota: Parse Error";
                statusBarItem.tooltip = `Error parsing response: ${e.message}\nResponse: ${body}`;
            }
        } else {
            statusBarItem.text = "AG Quota: Error";
            statusBarItem.tooltip = `Server returned status ${statusCode}\nBody: ${body}`;
        }
    }

    const refreshCmd = vscode.commands.registerCommand('antigravity-usage-monitor.refresh', () => {
        updateQuota();
    });
    context.subscriptions.push(refreshCmd);

    updateQuota();
    const interval = setInterval(updateQuota, 10000);
    context.subscriptions.push({
        dispose: () => clearInterval(interval)
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
