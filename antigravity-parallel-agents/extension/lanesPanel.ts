/**
 * LanesViewProvider — the "Swarm" sidebar webview that shows parallel chat lanes.
 *
 * It owns a single Orchestrator per run, subscribes to its typed event stream, and pushes
 * lane updates to the webview. Messages from the webview (start a run, merge/discard a
 * lane) come back through onDidReceiveMessage. See docs/PLAN.md §3.2.
 */

import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import { buildOrchestrator } from './orchestratorFactory.js';
import { mergeLane, discardLane, type Orchestrator } from '../src/core/index.js';

interface WebviewMessage {
  type: 'start' | 'merge' | 'discard';
  prompts?: string[];
  concurrency?: number;
  laneId?: string;
}

export class LanesViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'swarm.lanesPanel';
  private view?: vscode.WebviewView;
  private orchestrator?: Orchestrator;
  private unsubscribe?: () => void;
  private running = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      void this.onMessage(msg).catch((e) =>
        vscode.window.showErrorMessage(`Swarm: ${e instanceof Error ? e.message : String(e)}`),
      );
    });
  }

  /** Public entry used by commands / the chat participant to kick off a run. */
  async startRun(prompts: string[], concurrency = 4): Promise<void> {
    if (prompts.length === 0) return;
    if (this.running) {
      void vscode.window.showWarningMessage('Swarm: a run is already in progress.');
      return;
    }
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) {
      void vscode.window.showErrorMessage('Swarm: open a folder/repo first.');
      return;
    }

    const cfg = vscode.workspace.getConfiguration('swarm');
    this.running = true;
    try {
      this.unsubscribe?.();
      this.orchestrator = await buildOrchestrator({
        repoRoot,
        command: cfg.get<string>('command') || undefined,
        args: cfg.get<string[]>('args') || undefined,
      });
      this.unsubscribe = this.orchestrator.on((e) => void this.view?.webview.postMessage(e));

      const tasks = prompts.map((prompt, i) => ({ id: `lane-${i}`, prompt }));
      await this.orchestrator.run(tasks, { concurrency });
    } finally {
      this.running = false;
    }
  }

  private async onMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case 'start':
        await this.startRun(msg.prompts ?? [], msg.concurrency ?? 4);
        break;
      case 'merge':
        if (msg.laneId) await this.mergeLane(msg.laneId);
        break;
      case 'discard':
        if (msg.laneId) await this.discardLane(msg.laneId);
        break;
    }
  }

  /** Merge a lane's branch back into the active branch; surface conflicts to the user. */
  private async mergeLane(laneId: string): Promise<void> {
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) return;
    const res = await mergeLane(repoRoot, `swarm/${laneId}`, { deleteBranch: true });
    if (res.ok) {
      void vscode.window.showInformationMessage(`Swarm: ${res.message}`);
    } else if (res.conflicted) {
      void vscode.window.showWarningMessage(`Swarm: ${res.message} Resolve: ${res.conflicts.join(', ')}`);
    } else {
      void vscode.window.showErrorMessage(`Swarm: ${res.message}`);
    }
  }

  /** Throw away a lane's branch. */
  async discardLane(laneId: string): Promise<void> {
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) return;
    await discardLane(repoRoot, `swarm/${laneId}`);
    void vscode.window.showInformationMessage(`Swarm: discarded lane ${laneId}.`);
  }

  private html(webview: vscode.Webview): string {
    const nonce = randomUUID().replace(/-/g, '');
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');
    return /* html */ `<!doctype html><html><head><meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<style>
  body { font: 12px var(--vscode-font-family); color: var(--vscode-foreground); }
  .lane { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 6px; margin: 6px 0; }
  .status { font-weight: 600; text-transform: uppercase; font-size: 10px; }
  .done { color: var(--vscode-testing-iconPassed); }
  .failed { color: var(--vscode-testing-iconFailed); }
  pre { white-space: pre-wrap; max-height: 80px; overflow: auto; margin: 4px 0 0; opacity: .8; }
  textarea { width: 100%; box-sizing: border-box; }
  button.lane-act { margin-right: 4px; }
</style></head><body>
  <h3>Swarm — Lanes</h3>
  <textarea id="prompts" rows="4" placeholder="One task per line"></textarea>
  <button id="run">Run in parallel</button>
  <div id="lanes"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const lanesEl = document.getElementById('lanes');
  const lanes = new Map();
  document.getElementById('run').onclick = () => {
    const prompts = document.getElementById('prompts').value.split('\\n').map(s => s.trim()).filter(Boolean);
    vscode.postMessage({ type: 'start', prompts, concurrency: 4 });
  };
  // Build lane rows with the DOM API + textContent — never innerHTML — so untrusted agent
  // output can't inject markup/scripts into the webview.
  function render() {
    lanesEl.textContent = '';
    for (const l of lanes.values()) {
      const row = document.createElement('div');
      row.className = 'lane';
      const head = document.createElement('div');
      const badge = document.createElement('span');
      badge.className = 'status ' + (l.status || '');
      badge.textContent = l.status || '';
      head.appendChild(badge);
      head.appendChild(document.createTextNode(' ' + (l.task?.prompt ?? l.id)));
      const out = document.createElement('pre');
      out.textContent = l.output || '';
      const merge = document.createElement('button');
      merge.className = 'lane-act'; merge.textContent = 'Merge';
      merge.onclick = () => vscode.postMessage({ type: 'merge', laneId: l.id });
      const discard = document.createElement('button');
      discard.className = 'lane-act'; discard.textContent = 'Discard';
      discard.onclick = () => vscode.postMessage({ type: 'discard', laneId: l.id });
      row.appendChild(head); row.appendChild(out); row.appendChild(merge); row.appendChild(discard);
      lanesEl.appendChild(row);
    }
  }
  window.addEventListener('message', (ev) => {
    const e = ev.data;
    if (e.type === 'lane:update') { const cur = lanes.get(e.lane.id) || {}; lanes.set(e.lane.id, { ...cur, ...e.lane }); render(); }
    else if (e.type === 'lane:output') { const cur = lanes.get(e.laneId) || { id: e.laneId }; cur.output = (cur.output || '') + e.chunk; lanes.set(e.laneId, cur); render(); }
    else if (e.type === 'run:start') { lanes.clear(); render(); }
  });
</script></body></html>`;
  }
}
