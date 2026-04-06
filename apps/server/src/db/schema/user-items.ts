import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userItems = pgTable(
  'user_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'insight' | 'reference' | 'pattern' | 'asset'
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'), // body text (markdown for insights/patterns)
    language: varchar('language', { length: 50 }), // for patterns: 'typescript', 'python', etc.
    url: text('url'), // for assets: storage path or URL
    sourceChannelId: uuid('source_channel_id'), // for references: origin channel
    sourceMessageId: uuid('source_message_id'), // for references: origin message
    category: varchar('category', { length: 100 }), // user-defined grouping
    metadata: jsonb('metadata'), // tags[], senderName, etc.
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_items_user_type_idx').on(table.userId, table.type),
    index('user_items_user_category_idx').on(table.userId, table.category),
  ],
);

export type UserItem = typeof userItems.$inferSelect;
export type NewUserItem = typeof userItems.$inferInsert;
