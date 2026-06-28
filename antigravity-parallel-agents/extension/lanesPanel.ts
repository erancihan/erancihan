/**
 * LanesViewProvider — the "Swarm" sidebar webview that shows parallel chat lanes.
 *
 * It owns a single Orchestrator per run, subscribes to its typed event stream, and pushes
 * lane updates to the webview. Messages from the webview (start a run, merge/discard a
 * lane) come back through onDidReceiveMessage. See docs/PLAN.md §3.2.
 */

import * as vscode from 'vscode';
import { buildOrchestrator } from './orchestratorFactory.js';
import type { Orchestrator } from '../src/core/index.js';

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

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html();
    view.webview.onDidReceiveMessage((msg: WebviewMessage) => this.onMessage(msg));
  }

  /** Public entry used by commands / the chat participant to kick off a run. */
  async startRun(prompts: string[], concurrency = 4): Promise<void> {
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!repoRoot) {
      void vscode.window.showErrorMessage('Swarm: open a folder/repo first.');
      return;
    }
    this.orchestrator = await buildOrchestrator({ repoRoot });
    this.orchestrator.on((e) => this.view?.webview.postMessage(e));

    const tasks = prompts.map((prompt, i) => ({ id: `lane-${i}`, prompt }));
    await this.orchestrator.run(tasks, { concurrency });
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
        // Phase 5: delete the lane's branch. Branch name is `swarm/<laneId>`.
        break;
    }
  }

  /** Phase 5: fast-forward / merge the lane branch back into the active branch. */
  private async mergeLane(laneId: string): Promise<void> {
    const branch = `swarm/${laneId}`;
    const repoRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    void vscode.window.showInformationMessage(`Swarm: merge ${branch} (repo ${repoRoot}) — Phase 5`);
  }

  private html(): string {
    return /* html */ `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font: 12px var(--vscode-font-family); color: var(--vscode-foreground); }
  .lane { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 6px; margin: 6px 0; }
  .status { font-weight: 600; text-transform: uppercase; font-size: 10px; }
  .done { color: var(--vscode-testing-iconPassed); }
  .failed { color: var(--vscode-testing-iconFailed); }
  pre { white-space: pre-wrap; max-height: 80px; overflow: auto; margin: 4px 0 0; opacity: .8; }
  textarea { width: 100%; box-sizing: border-box; }
</style></head><body>
  <h3>Swarm — Lanes</h3>
  <textarea id="prompts" rows="4" placeholder="One task per line"></textarea>
  <button id="run">Run in parallel</button>
  <div id="lanes"></div>
<script>
  const vscode = acquireVsCodeApi();
  const lanesEl = document.getElementById('lanes');
  const lanes = new Map();
  document.getElementById('run').onclick = () => {
    const prompts = document.getElementById('prompts').value.split('\\n').map(s => s.trim()).filter(Boolean);
    vscode.postMessage({ type: 'start', prompts, concurrency: 4 });
  };
  function render() {
    lanesEl.innerHTML = '';
    for (const l of lanes.values()) {
      const div = document.createElement('div');
      div.className = 'lane';
      div.innerHTML = '<span class="status ' + l.status + '">' + l.status + '</span> '
        + (l.task?.prompt ?? l.id) + '<pre>' + (l.output || '') + '</pre>';
      lanesEl.appendChild(div);
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
