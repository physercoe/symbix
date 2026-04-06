import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { workspaces } from './workspaces';

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    actorType: varchar('actor_type', { length: 10 }).notNull(), // 'user' | 'agent' | 'system'
    actorId: uuid('actor_id').notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('activity_events_team_type_idx').on(table.teamId, table.eventType, table.createdAt),
    index('activity_events_actor_idx').on(table.actorId, table.createdAt),
  ],
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
