// Channel types
export const CHANNEL_TYPES = ['public', 'private', 'dm', 'device'] as const;
export type ChannelType = typeof CHANNEL_TYPES[number];

// Agent classes
export const AGENT_CLASSES = ['software', 'physical', 'hybrid'] as const;
export type AgentClass = typeof AGENT_CLASSES[number];

// Agent statuses
export const AGENT_STATUSES = ['active', 'sleeping', 'disabled', 'offline', 'charging', 'error'] as const;
export type AgentStatus = typeof AGENT_STATUSES[number];

// Message content types
export const CONTENT_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'file',
  'location',
  'sensor_reading',
  'action_result',
  'camera_frame',
] as const;
export type ContentType = typeof CONTENT_TYPES[number];

// Sender types
export const SENDER_TYPES = ['user', 'agent', 'system'] as const;
export type SenderType = typeof SENDER_TYPES[number];

// Channel member types
export const MEMBER_TYPES = ['user', 'agent'] as const;
export type MemberType = typeof MEMBER_TYPES[number];

// Machine types
export const MACHINE_TYPES = ['desktop', 'server', 'robot', 'browser', 'cloud'] as const;
export type MachineType = typeof MACHINE_TYPES[number];

// Machine statuses
export const MACHINE_STATUSES = ['online', 'offline'] as const;
export type MachineStatus = typeof MACHINE_STATUSES[number];

// Agent types (how the agent is hosted/connected)
export const AGENT_TYPES = ['hosted_bot', 'cli_agent', 'cloud_agent', 'device_agent'] as const;
export type AgentType = typeof AGENT_TYPES[number];

// Workspace roles
export const WORKSPACE_ROLES = ['owner', 'member', 'observer'] as const;
export type WorkspaceRole = typeof WORKSPACE_ROLES[number];
