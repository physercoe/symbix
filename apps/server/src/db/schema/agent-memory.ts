import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  unique,
  customType,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.js';

// pgvector column type — drizzle-orm/pg-core exposes `vector` in newer versions,
// but we use a customType here for maximum compatibility with 0.38.x.
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    const dims = (config as { dimensions?: number } | undefined)?.dimensions;
    return dims ? `vector(${dims})` : 'vector';
  },
  fromDriver(value: string): number[] {
    // postgres-js returns the pgvector value as a string like "[0.1,0.2,...]"
    return JSON.parse(value.replace(/^\[/, '[').replace(/\]$/, ']'));
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});

export const agentMemory = pgTable(
  'agent_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 255 }).notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    metadata: jsonb('metadata'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique('agent_memory_agent_id_key_unique').on(table.agentId, table.key)],
);

export type AgentMemory = typeof agentMemory.$inferSelect;
export type NewAgentMemory = typeof agentMemory.$inferInsert;
