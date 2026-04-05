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
