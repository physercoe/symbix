import type { AgentClass, AgentStatus, AgentType, ChannelType, ContentType, MachineStatus, MachineType, MemberType, SenderType, WorkspaceRole } from './constants.js';

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

export interface Machine {
  id: string;
  workspaceId: string;
  name: string;
  machineType: MachineType;
  apiKey: string;
  status: MachineStatus;
  metadata: Record<string, unknown>;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  avatarUrl: string | null;
  agentClass: AgentClass;
  agentType: AgentType;
  machineId: string | null;
  roleDescription: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  llmBaseUrl: string | null;
  llmApiKey: string | null;
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

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  memberType: MemberType;
  userId: string | null;
  agentId: string | null;
  role: WorkspaceRole;
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

export type WorkspaceItemType = 'doc' | 'file' | 'link' | 'template';

export interface WorkspaceItem {
  id: string;
  workspaceId: string;
  type: WorkspaceItemType;
  title: string;
  content: string | null;
  url: string | null;
  category: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string;
  updatedAt: string;
  createdAt: string;
}

export type UserItemType = 'insight' | 'reference' | 'pattern' | 'asset';

export interface UserItem {
  id: string;
  userId: string;
  type: UserItemType;
  title: string;
  content: string | null;
  language: string | null;
  url: string | null;
  sourceChannelId: string | null;
  sourceMessageId: string | null;
  category: string | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
  createdAt: string;
}

export type SpecType = 'agent' | 'workspace';
export type SpecVisibility = 'private' | 'workspace' | 'public';

export interface Spec {
  id: string;
  userId: string;
  specType: SpecType;
  name: string;
  version: string | null;
  description: string | null;
  content: Record<string, unknown>;
  visibility: SpecVisibility;
  category: string | null;
  usageCount: number;
  updatedAt: string;
  createdAt: string;
}

// ── Spec content structures (for reference, stored as JSON) ──

export interface AgentSpecContent {
  identity: {
    role: string;
    personality: string[];
  };
  capabilities: {
    tools: string[];
    domains: string[];
    languages: string[];
  };
  behavior: {
    always: string[];
    never: string[];
    triggers: Record<string, string>;
  };
  communication: {
    tone: string;
    verbosity: 'concise' | 'balanced' | 'detailed';
    format: string[];
  };
  llm: {
    provider: string;
    model: string;
  };
}

export interface WorkspaceSpecContent {
  objectives: string[];
  rules: string[];
  roles: Array<{ name: string; permissions: string[] }>;
  channels: Array<{ name: string; type: string; purpose: string; agents?: string[] }>;
  agents: Array<{ spec: string; deploy_to: string[]; overrides?: Record<string, unknown> }>;
  knowledge_seed: Array<{ title: string; type: string }>;
}
