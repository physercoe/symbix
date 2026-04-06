import { pgTable, uuid, varchar, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const specs = pgTable(
  'specs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    specType: varchar('spec_type', { length: 20 }).notNull(), // 'agent' | 'workspace'
    name: varchar('name', { length: 200 }).notNull(),
    version: varchar('version', { length: 20 }).default('1.0'),
    description: text('description'),
    content: jsonb('content').notNull(), // the structured spec as JSON
    visibility: varchar('visibility', { length: 20 }).default('private'), // 'private' | 'workspace' | 'public'
    category: varchar('category', { length: 100 }),
    usageCount: integer('usage_count').default(0),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('specs_user_type_idx').on(table.userId, table.specType),
    index('specs_visibility_idx').on(table.visibility),
  ],
);

export type Spec = typeof specs.$inferSelect;
export type NewSpec = typeof specs.$inferInsert;
