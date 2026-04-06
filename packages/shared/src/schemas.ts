import { z } from 'zod';
import { AGENT_CLASSES, AGENT_TYPES, CHANNEL_TYPES, CONTENT_TYPES, MACHINE_TYPES, MEMBER_TYPES, WORKSPACE_ROLES, TEAM_ROLES, SPEC_VISIBILITY } from './constants';

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const addTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(TEAM_ROLES).default('member'),
});

export const updateTeamMemberRoleSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(TEAM_ROLES),
});

// Workspace schemas
export const createWorkspaceSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Channel schemas
export const createChannelSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(CHANNEL_TYPES),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// Message schemas
export const attachmentSchema = z.object({
  url: z.string(),
  contentType: z.string(),
  filename: z.string(),
  size: z.number().optional(),
});

export const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().optional(),
  contentType: z.enum(CONTENT_TYPES).default('text'),
  mediaUrl: z.string().optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  parentId: z.string().uuid().optional(),
});

export const listMessagesSchema = z.object({
  channelId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// Agent schemas
export const createAgentSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
  roleDescription: z.string(),
  systemPrompt: z.string(),
  llmProvider: z.string().default('anthropic'),
  llmModel: z.string().default('claude-sonnet-4-20250514'),
  llmBaseUrl: z.string().optional(),
  llmApiKey: z.string().optional(),
  agentClass: z.enum(AGENT_CLASSES).default('software'),
  agentType: z.enum(AGENT_TYPES).default('hosted_bot'),
  machineId: z.string().uuid().optional(),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
});

export const updateAgentSchema = createAgentSchema
  .omit({ teamId: true })
  .partial();

// Spawn agent on a machine schema
export const deployAgentSchema = z.object({
  agentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  config: z.record(z.unknown()).optional(),
});

export const spawnAgentSchema = z.object({
  teamId: z.string().uuid(),
  machineId: z.string().uuid(),
  name: z.string().min(1).max(100),
  agentType: z.enum(AGENT_TYPES).default('cli_agent'),
  adapter: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

// Machine schemas
export const registerMachineSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
  machineType: z.enum(MACHINE_TYPES).default('desktop'),
  metadata: z.record(z.unknown()).optional(),
});

export const updateMachineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Agent memory schema
export const updateAgentMemorySchema = z.object({
  key: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

// Channel member schema
export const addChannelMemberSchema = z.object({
  channelId: z.string().uuid(),
  memberType: z.enum(MEMBER_TYPES),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

// Workspace member schema
export const addWorkspaceMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  memberType: z.enum(MEMBER_TYPES),
  userId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  role: z.enum(WORKSPACE_ROLES).default('member'),
});

// Workspace invite schema
export const inviteToWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
});

// Inferred input types
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type SpawnAgentInput = z.infer<typeof spawnAgentSchema>;
export type RegisterMachineInput = z.infer<typeof registerMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
export type UpdateAgentMemoryInput = z.infer<typeof updateAgentMemorySchema>;
export type AddChannelMemberInput = z.infer<typeof addChannelMemberSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type InviteToWorkspaceInput = z.infer<typeof inviteToWorkspaceSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof updateTeamMemberRoleSchema>;
export type DeployAgentInput = z.infer<typeof deployAgentSchema>;
