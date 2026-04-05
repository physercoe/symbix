import { SubprocessAdapter } from './adapters/subprocess.js';
import { ClaudeCodeAdapter } from './adapters/claude-code.js';

export type SendMessageFn = (agentId: string, channelId: string, content: string) => void;

export interface AgentAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  deliverMessage(message: { channelId: string; content: string | null }): void;
}

export class AgentManager {
  private agents = new Map<string, AgentAdapter>();

  constructor(private sendMessage: SendMessageFn) {}

  spawn(agentId: string, config: Record<string, unknown>) {
    if (this.agents.has(agentId)) {
      console.log(`Agent ${agentId} already running`);
      return;
    }

    const adapter = config.adapter as string;
    let agent: AgentAdapter;

    switch (adapter) {
      case 'claude-code':
        agent = new ClaudeCodeAdapter(agentId, config, this.sendMessage);
        break;
      case 'subprocess':
      default:
        agent = new SubprocessAdapter(agentId, config, this.sendMessage);
        break;
    }

    this.agents.set(agentId, agent);
    agent.start().catch((err) => {
      console.error(`Failed to start agent ${agentId}:`, err);
      this.agents.delete(agentId);
    });
  }

  stop(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.stop().catch((err) => {
        console.error(`Error stopping agent ${agentId}:`, err);
      });
      this.agents.delete(agentId);
    }
  }

  deliverMessage(agentId: string, message: { channelId: string; content: string | null }) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.deliverMessage(message);
    } else {
      console.warn(`No agent found for ${agentId}`);
    }
  }

  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  async stopAll() {
    const stops = Array.from(this.agents.entries()).map(async ([id, agent]) => {
      try {
        await agent.stop();
      } catch (err) {
        console.error(`Error stopping agent ${id}:`, err);
      }
    });
    await Promise.all(stops);
    this.agents.clear();
  }
}
