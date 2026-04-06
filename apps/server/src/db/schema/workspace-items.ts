import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const workspaceItems = pgTable(
  'workspace_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'doc' | 'file' | 'link' | 'template'
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'), // markdown body for docs/templates, description for files/links
    url: text('url'), // external URL for links, storage path for files
    category: varchar('category', { length: 100 }), // user-defined grouping (e.g. "onboarding", "api-refs")
    status: varchar('status', { length: 20 }).default('active'), // 'active' | 'archived'
    metadata: jsonb('metadata'), // fileSize, mimeType, tags[], etc.
    createdBy: uuid('created_by').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('workspace_items_workspace_type_idx').on(table.workspaceId, table.type),
    index('workspace_items_workspace_category_idx').on(table.workspaceId, table.category),
  ],
);

export type WorkspaceItem = typeof workspaceItems.$inferSelect;
export type NewWorkspaceItem = typeof workspaceItems.$inferInsert;
