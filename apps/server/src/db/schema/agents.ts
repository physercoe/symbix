import { pgTable, uuid, varchar, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { machines } from './machines';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  machineId: uuid('machine_id').references(() => machines.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  agentClass: varchar('agent_class', { length: 20 }).notNull().default('software'),
  agentType: varchar('agent_type', { length: 30 }).notNull().default('hosted_bot'),
  roleDescription: text('role_description').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  llmProvider: varchar('llm_provider', { length: 50 }).notNull().default('anthropic'),
  llmModel: varchar('llm_model', { length: 100 }).notNull().default('claude-sonnet-4-20250514'),
  llmBaseUrl: text('llm_base_url'),
  llmApiKey: text('llm_api_key'),
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
