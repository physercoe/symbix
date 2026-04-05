import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { channels } from './channels';
import { messages } from './messages';

export const pinnedMessages = pgTable(
  'pinned_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
    pinnedBy: uuid('pinned_by').notNull(),
    pinnedAt: timestamp('pinned_at').defaultNow().notNull(),
  },
  (table) => [
    index('pinned_messages_channel_id_idx').on(table.channelId),
  ],
);

export type PinnedMessage = typeof pinnedMessages.$inferSelect;
export type NewPinnedMessage = typeof pinnedMessages.$inferInsert;
