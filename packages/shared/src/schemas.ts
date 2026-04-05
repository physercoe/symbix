import { z } from 'zod';
import { AGENT_CLASSES, CHANNEL_TYPES, CONTENT_TYPES, MEMBER_TYPES } from './constants.js';

// Workspace schemas
export const createWorkspaceSchema = z.object({
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
export const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().optional(),
  contentType: z.enum(CONTENT_TYPES).default('text'),
  mediaUrl: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
});

export const listMessagesSchema = z.object({
  channelId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// Agent schemas
export const createAgentSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  roleDescription: z.string(),
  systemPrompt: z.string(),
  llmProvider: z.string().default('anthropic'),
  llmModel: z.string().default('claude-sonnet-4-20250514'),
  agentClass: z.enum(AGENT_CLASSES).default('software'),
  config: z.record(z.unknown()).optional(),
  capabilities: z.array(z.string()).optional(),
});

export const updateAgentSchema = createAgentSchema
  .omit({ workspaceId: true })
  .partial();

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
export type UpdateAgentMemoryInput = z.infer<typeof updateAgentMemorySchema>;
export type AddChannelMemberInput = z.infer<typeof addChannelMemberSchema>;
export type InviteToWorkspaceInput = z.infer<typeof inviteToWorkspaceSchema>;
