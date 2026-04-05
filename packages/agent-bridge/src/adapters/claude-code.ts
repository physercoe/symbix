import type { AgentAdapter, SendMessageFn } from '../agent-manager.js';

/**
 * Claude Code Agent SDK adapter.
 *
 * Uses @anthropic-ai/claude-code SDK to spawn a headless Claude Code session.
 * The SDK handles tool use, file editing, and terminal commands internally.
 *
 * This is a placeholder that will be fully implemented when the Claude Code
 * Agent SDK is integrated. For now, it falls back to a simple subprocess.
 */
export class ClaudeCodeAdapter implements AgentAdapter {
  private abortController: AbortController | null = null;

  constructor(
    private agentId: string,
    private config: Record<string, unknown>,
    private sendMessage: SendMessageFn,
  ) {}

  async start() {
    console.log(`[claude-code:${this.agentId}] Starting Claude Code agent...`);
    // The Claude Code Agent SDK (@anthropic-ai/claude-code) provides:
    // - query(): send a prompt and get streamed responses
    // - Automatic tool use (file read/write, bash, etc.)
    // - Session management with conversation history
    //
    // Integration pattern:
    // 1. Import { query } from '@anthropic-ai/claude-code'
    // 2. On channel_message, call query({ prompt: message.content, options: { cwd } })
    // 3. Collect streamed text results and send back via sendMessage()
    //
    // Placeholder: log that agent is ready
    console.log(`[claude-code:${this.agentId}] Agent ready (SDK integration pending)`);
  }

  async stop() {
    console.log(`[claude-code:${this.agentId}] Stopping...`);
    this.abortController?.abort();
  }

  deliverMessage(message: { channelId: string; content: string | null }) {
    if (!message.content) return;

    console.log(`[claude-code:${this.agentId}] Received: ${message.content.slice(0, 100)}`);

    // TODO: Implement with Claude Code Agent SDK
    // const result = await query({
    //   prompt: message.content,
    //   options: { cwd: this.config.cwd as string },
    //   abortController: this.abortController,
    // });
    // for await (const event of result) {
    //   if (event.type === 'text') accumulated += event.text;
    // }
    // this.sendMessage(this.agentId, message.channelId, accumulated);

    // Placeholder response
    this.sendMessage(
      this.agentId,
      message.channelId,
      `[Claude Code agent received your message. SDK integration pending.]`,
    );
  }
}
