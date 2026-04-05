import type { Message } from './types.js';

// Client → Server messages
export interface SubscribeMessage {
  type: 'subscribe';
  channelId: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  channelId: string;
}

export interface TypingMessage {
  type: 'typing';
  channelId: string;
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | TypingMessage;

// Server → Client messages
export interface NewMessageEvent {
  type: 'new_message';
  message: Message;
}

export interface AgentTypingEvent {
  type: 'agent_typing';
  agentId: string;
  channelId: string;
  chunk: string;
}

export interface AgentStatusEvent {
  type: 'agent_status';
  agentId: string;
  status: string;
}

export interface AgentTelemetryEvent {
  type: 'agent_telemetry';
  agentId: string;
  telemetry: Record<string, unknown>;
}

export interface PresenceEvent {
  type: 'presence';
  userId: string;
  online: boolean;
}

export type ServerMessage =
  | NewMessageEvent
  | AgentTypingEvent
  | AgentStatusEvent
  | AgentTelemetryEvent
  | PresenceEvent;

// Machine → Symbix messages (from agent-bridge daemon)
export interface AgentSpawnedMessage {
  type: 'agent_spawned';
  agentId: string;
}

export interface AgentStoppedMessage {
  type: 'agent_stopped';
  agentId: string;
}

export interface AgentMessageMessage {
  type: 'agent_message';
  agentId: string;
  channelId: string;
  content: string;
}

export interface MachineStatusMessage {
  type: 'machine_status';
  metadata: Record<string, unknown>;
}

export type MachineToServerMessage =
  | AgentSpawnedMessage
  | AgentStoppedMessage
  | AgentMessageMessage
  | MachineStatusMessage;

// Symbix → Machine messages (commands to agent-bridge)
export interface SpawnAgentCommand {
  type: 'spawn_agent';
  agentId: string;
  config: Record<string, unknown>;
}

export interface StopAgentCommand {
  type: 'stop_agent';
  agentId: string;
}

export interface ChannelMessageCommand {
  type: 'channel_message';
  agentId: string;
  message: Message;
}

export type ServerToMachineMessage =
  | SpawnAgentCommand
  | StopAgentCommand
  | ChannelMessageCommand;
