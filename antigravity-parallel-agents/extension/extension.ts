/**
 * Extension entrypoint — registers Swarm inside Antigravity (a VS Code fork):
 *   • the "Swarm" Lanes sidebar (parallel, sandboxed chats), and
 *   • the `@swarm` chat participant so you can spin a lane from the native chat.
 *
 * All real work lives in ../src/core; this file is a thin host. See docs/PLAN.md §3.2.
 */

import * as vscode from 'vscode';
import { LanesViewProvider } from './lanesPanel.js';

export function activate(context: vscode.ExtensionContext): void {
  const lanes = new LanesViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LanesViewProvider.viewId, lanes),

    vscode.commands.registerCommand('swarm.openPanel', () =>
      vscode.commands.executeCommand(`${LanesViewProvider.viewId}.focus`),
    ),
    vscode.commands.registerCommand('swarm.newRun', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Swarm: tasks to run in parallel (separate with " | ")',
        placeHolder: 'add tests | fix lint | write docs',
      });
      if (input) await lanes.startRun(splitTasks(input));
    }),
  );

  // `@swarm` chat participant: entry point from the IDE's built-in chat.
  const participant = vscode.chat.createChatParticipant('swarm.lanes', async (request, _ctx, response) => {
    const prompts = splitTasks(request.prompt);
    if (request.command === 'lanes' || prompts.length === 0) {
      await vscode.commands.executeCommand('swarm.openPanel');
      response.markdown('Opened the **Swarm — Lanes** panel.');
      return;
    }
    response.markdown(`Launching **${prompts.length}** sandboxed lane(s) in parallel…\n`);
    response.progress('Spinning up isolated worktrees…');
    await lanes.startRun(prompts);
    response.markdown('\nRunning. Watch progress in the **Swarm — Lanes** panel.');
  });
  context.subscriptions.push(participant);
}

export function deactivate(): void {
  /* subscriptions are disposed by VS Code */
}

/** Split a chat/input string into discrete tasks (by "|" or newlines). */
function splitTasks(input: string): string[] {
  return input
    .split(/\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}
