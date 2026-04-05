import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { channels } from './channels';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
    senderType: varchar('sender_type', { length: 10 }).notNull(),
    senderId: uuid('sender_id').notNull(),
    content: text('content'),
    contentType: varchar('content_type', { length: 30 }).notNull().default('text'),
    mediaUrl: text('media_url'),
    metadata: jsonb('metadata'),
    parentId: uuid('parent_id'), // self-reference; FK added via migration to avoid circular ref issues
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('messages_channel_id_created_at_idx').on(table.channelId, table.createdAt),
  ],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
