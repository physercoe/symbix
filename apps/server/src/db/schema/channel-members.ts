import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { users } from './users';
import { agents } from './agents';

export const channelMembers = pgTable('channel_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  memberType: varchar('member_type', { length: 10 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  agentId: uuid('agent_id').references(() => agents.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export type ChannelMember = typeof channelMembers.$inferSelect;
export type NewChannelMember = typeof channelMembers.$inferInsert;
