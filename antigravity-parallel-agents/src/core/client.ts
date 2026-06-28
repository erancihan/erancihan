/**
 * Abstraction over the Antigravity Agent API (Gemini Managed Agents).
 *
 * This backs the CLOUD lane runner (`ManagedAgentsLaneRunner`): each lane becomes a
 * remote Google-hosted sandbox — an alternative isolation backend to the local
 * worktree+nsjail path. The local CLI runner is the default (docs/PLAN.md §1.4).
 *
 * Behind this interface so we can develop/test offline with a fake and swap in the real
 * HTTP client once the wire schema is locked (docs/PLAN.md §6 Q6).
 *
 * Real endpoint (to implement in `HttpAgentClient`):
 *   POST https://generativelanguage.googleapis.com/v1beta/interactions
 *   headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY }
 *   body:    { agent: 'antigravity-preview-05-2026',
 *              input: [{ type: 'text', text }],
 *              environment: 'remote' | <inline sources with AGENTS.md + skills> }
 *
 * NOTE: exact field names for inline sources / streaming / result shape are unconfirmed.
 */

import type { LaneResult } from './types.js';

export interface StartInteractionInput {
  prompt: string;
  agentsMd?: string;
  skills?: Array<{ name: string; body: string }>;
}

export interface InteractionHandle {
  /** Opaque environment/session handle used to resume or poll. */
  environment: string;
}

export interface InteractionUpdate {
  /** Last action / status line for display. */
  lastAction?: string;
  /** Incremental output chunk, if streaming. */
  chunk?: string;
  done: boolean;
  result?: LaneResult;
}

export interface AgentClient {
  /** Kick off a new agent interaction; returns a resumable handle. */
  start(input: StartInteractionInput): Promise<InteractionHandle>;
  /**
   * Stream updates for an interaction until it completes.
   * Implementations may stream (SSE) or long-poll under the hood.
   */
  watch(handle: InteractionHandle): AsyncIterable<InteractionUpdate>;
  /** Best-effort cancellation. */
  cancel(handle: InteractionHandle): Promise<void>;
}

/**
 * Placeholder for the real HTTP implementation — Phase 1.
 * Left unimplemented so the build is green while the schema is being confirmed.
 */
export class HttpAgentClient implements AgentClient {
  constructor(
    // Reads GEMINI_API_KEY when run under Node; cast avoids needing @types/node here.
    private readonly apiKey: string = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.GEMINI_API_KEY ?? '',
    private readonly agent: string = 'antigravity-preview-05-2026',
    private readonly baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta',
  ) {}

  start(_input: StartInteractionInput): Promise<InteractionHandle> {
    throw new Error('HttpAgentClient.start not implemented yet — see docs/PLAN.md Phase 1');
  }

  watch(_handle: InteractionHandle): AsyncIterable<InteractionUpdate> {
    throw new Error('HttpAgentClient.watch not implemented yet — see docs/PLAN.md Phase 1');
  }

  cancel(_handle: InteractionHandle): Promise<void> {
    throw new Error('HttpAgentClient.cancel not implemented yet — see docs/PLAN.md Phase 1');
  }
}
