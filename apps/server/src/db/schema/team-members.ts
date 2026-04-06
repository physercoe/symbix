import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { users } from './users';

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'), // 'owner' | 'admin' | 'member' | 'viewer'
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    unique('team_members_team_user_idx').on(table.teamId, table.userId),
  ],
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
