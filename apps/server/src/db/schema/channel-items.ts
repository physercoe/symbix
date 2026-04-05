import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { channels } from './channels';

export const channelItems = pgTable(
  'channel_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'task' | 'doc' | 'link' | 'file'
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'),
    url: text('url'),
    status: varchar('status', { length: 20 }).default('open'), // for tasks: 'open' | 'in_progress' | 'done'
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('channel_items_channel_id_type_idx').on(table.channelId, table.type),
  ],
);

export type ChannelItem = typeof channelItems.$inferSelect;
export type NewChannelItem = typeof channelItems.$inferInsert;
