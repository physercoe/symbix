import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';

export const machines = pgTable('machines', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  machineType: varchar('machine_type', { length: 20 }).notNull().default('desktop'),
  apiKey: varchar('api_key', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('offline'),
  metadata: jsonb('metadata').default({}),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type NewMachine = typeof machines.$inferInsert;
