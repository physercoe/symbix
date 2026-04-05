import type { AgentClass, AgentStatus, ChannelType, ContentType, MemberType, SenderType } from './constants.js';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  pushTokens: unknown[];
  notificationPrefs: Record<string, unknown>;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  type: ChannelType;
  createdAt: string;
}

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  avatarUrl: string | null;
  agentClass: AgentClass;
  roleDescription: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  deviceType: string | null;
  hardwareId: string | null;
  mqttTopic: string | null;
  status: AgentStatus;
  lastLocation: unknown | null;
  batteryLevel: number | null;
  sensorData: unknown | null;
  config: Record<string, unknown>;
  capabilities: string[];
  createdAt: string;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  key: string;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  memberType: MemberType;
  userId: string | null;
  agentId: string | null;
  joinedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderType: SenderType;
  senderId: string;
  content: string | null;
  contentType: ContentType;
  mediaUrl: string | null;
  metadata: Record<string, unknown> | null;
  parentId: string | null;
  createdAt: string;
}

export interface DeviceEvent {
  id: string;
  agentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
