import WebSocket from 'ws';
import os from 'os';
import { AgentManager } from './agent-manager.js';

export class Daemon {
  private ws: WebSocket | null = null;
  private agentManager: AgentManager;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private intentionalClose = false;

  constructor(
    private apiKey: string,
    private serverUrl: string,
  ) {
    this.agentManager = new AgentManager((agentId, channelId, content) => {
      this.send({ type: 'agent_message', agentId, channelId, content });
    });
  }

  async start() {
    this.connect();

    // Send machine status periodically
    setInterval(() => {
      this.sendMachineStatus();
    }, 30000);

    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private connect() {
    const url = `${this.serverUrl}?apiKey=${this.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('Connected to Symbix');
      this.reconnectDelay = 1000;
      this.sendMachineStatus();
    });

    this.ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleCommand(msg);
      } catch {
        // Ignore malformed
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      console.log(`Disconnected (${code}: ${reason.toString()})`);
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('WebSocket error:', err.message);
    });
  }

  private scheduleReconnect() {
    console.log(`Reconnecting in ${this.reconnectDelay / 1000}s...`);
    setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private handleCommand(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'spawn_agent': {
        const { agentId, config } = msg as { agentId: string; config: Record<string, unknown> };
        console.log(`Spawning agent ${agentId}...`);
        this.agentManager.spawn(agentId, config);
        this.send({ type: 'agent_spawned', agentId });
        break;
      }

      case 'stop_agent': {
        const { agentId } = msg as { agentId: string };
        console.log(`Stopping agent ${agentId}...`);
        this.agentManager.stop(agentId);
        this.send({ type: 'agent_stopped', agentId });
        break;
      }

      case 'channel_message': {
        const { agentId, message } = msg as { agentId: string; message: { channelId: string; content: string | null } };
        this.agentManager.deliverMessage(agentId, message);
        break;
      }
    }
  }

  private sendMachineStatus() {
    this.send({
      type: 'machine_status',
      metadata: {
        os: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024),
        uptime: Math.round(os.uptime()),
        agents: this.agentManager.listAgents(),
      },
    });
  }

  private send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private async shutdown() {
    console.log('\nShutting down...');
    this.intentionalClose = true;
    await this.agentManager.stopAll();
    this.ws?.close();
    process.exit(0);
  }
}
