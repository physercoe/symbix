import { pgTable, uuid, varchar, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  agentClass: varchar('agent_class', { length: 20 }).notNull().default('software'),
  roleDescription: text('role_description').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  llmProvider: varchar('llm_provider', { length: 50 }).notNull().default('anthropic'),
  llmModel: varchar('llm_model', { length: 100 }).notNull().default('claude-sonnet-4-20250514'),
  deviceType: varchar('device_type', { length: 100 }),
  hardwareId: varchar('hardware_id', { length: 255 }).unique(),
  mqttTopic: varchar('mqtt_topic', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('sleeping'),
  lastLocation: jsonb('last_location'),
  batteryLevel: integer('battery_level'),
  sensorData: jsonb('sensor_data'),
  config: jsonb('config').default({}),
  capabilities: text('capabilities').array().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
