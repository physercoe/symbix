import { spawn, type ChildProcess } from 'child_process';
import type { AgentAdapter, SendMessageFn } from '../agent-manager.js';

export class SubprocessAdapter implements AgentAdapter {
  private process: ChildProcess | null = null;
  private buffer = '';

  constructor(
    private agentId: string,
    private config: Record<string, unknown>,
    private sendMessage: SendMessageFn,
  ) {}

  async start() {
    const command = (this.config.command as string) ?? 'echo';
    const args = (this.config.args as string[]) ?? [];
    const cwd = (this.config.cwd as string) ?? process.cwd();

    this.process = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, SYMBIX_AGENT_ID: this.agentId },
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'message' && msg.channelId && msg.content) {
            this.sendMessage(this.agentId, msg.channelId, msg.content);
          }
        } catch {
          // Not JSON, ignore
        }
      }
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      console.error(`[agent:${this.agentId}] ${chunk.toString().trim()}`);
    });

    this.process.on('exit', (code) => {
      console.log(`[agent:${this.agentId}] Process exited with code ${code}`);
    });
  }

  async stop() {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      // Force kill after 5s
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  deliverMessage(message: { channelId: string; content: string | null }) {
    if (this.process?.stdin?.writable) {
      this.process.stdin.write(JSON.stringify(message) + '\n');
    }
  }
}
