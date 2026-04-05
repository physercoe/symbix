import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';

export const deviceEvents = pgTable('device_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type DeviceEvent = typeof deviceEvents.$inferSelect;
export type NewDeviceEvent = typeof deviceEvents.$inferInsert;
