import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { teams, teamMembers, users } from '../db/schema/index.js';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberRoleSchema,
} from '@symbix/shared';
import { recordActivity } from '../services/activity.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export const teamsRouter = router({
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate a unique slug
      let slug = slugify(input.name);
      const [existing] = await ctx.db
        .select()
        .from(teams)
        .where(eq(teams.slug, slug))
        .limit(1);

      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const [team] = await ctx.db
        .insert(teams)
        .values({
          name: input.name,
          slug,
          ownerId: ctx.userId,
          description: input.description,
        })
        .returning();

      // Add creator as owner
      await ctx.db.insert(teamMembers).values({
        teamId: team.id,
        userId: ctx.userId,
        role: 'owner',
      });

      return team;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({
        team: teams,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, ctx.userId));

    return memberships.map((m) => ({ ...m.team, role: m.role }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [team] = await ctx.db
        .select()
        .from(teams)
        .where(eq(teams.id, input.id))
        .limit(1);

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      return team;
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [team] = await ctx.db
        .select()
        .from(teams)
        .where(eq(teams.slug, input.slug))
        .limit(1);

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      return team;
    }),

  update: protectedProcedure
    .input(updateTeamSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Only owner or admin can update
      const [membership] = await ctx.db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, ctx.userId)))
        .limit(1);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      const [updated] = await ctx.db
        .update(teams)
        .set(data)
        .where(eq(teams.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [team] = await ctx.db
        .select()
        .from(teams)
        .where(eq(teams.id, input.id))
        .limit(1);

      if (!team) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      if (team.ownerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the team owner can delete the team' });
      }

      await ctx.db.delete(teams).where(eq(teams.id, input.id));
      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.db
        .select({
          id: teamMembers.id,
          teamId: teamMembers.teamId,
          userId: teamMembers.userId,
          role: teamMembers.role,
          joinedAt: teamMembers.joinedAt,
          userName: users.name,
          userEmail: users.email,
          userAvatarUrl: users.avatarUrl,
        })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .where(eq(teamMembers.teamId, input.teamId));

      return members;
    }),

  addMember: protectedProcedure
    .input(addTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      // Only owner or admin can add members
      const [membership] = await ctx.db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.userId)))
        .limit(1);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Find user by email
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found with that email' });
      }

      const [member] = await ctx.db
        .insert(teamMembers)
        .values({
          teamId: input.teamId,
          userId: user.id,
          role: input.role,
        })
        .onConflictDoNothing()
        .returning();

      if (!member) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User is already a team member' });
      }

      recordActivity({
        teamId: input.teamId,
        actorType: 'user',
        actorId: ctx.userId,
        eventType: 'member_join',
        metadata: { memberId: user.id, role: input.role },
      });

      return member;
    }),

  removeMember: protectedProcedure
    .input(z.object({ teamId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only owner or admin can remove members
      const [membership] = await ctx.db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.userId)))
        .limit(1);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Can't remove the team owner
      const [team] = await ctx.db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      if (team && team.ownerId === input.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the team owner' });
      }

      await ctx.db
        .delete(teamMembers)
        .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, input.userId)));

      recordActivity({
        teamId: input.teamId,
        actorType: 'user',
        actorId: ctx.userId,
        eventType: 'member_leave',
        metadata: { memberId: input.userId },
      });

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(updateTeamMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Only owner can change roles
      const [membership] = await ctx.db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, ctx.userId)))
        .limit(1);

      if (!membership || membership.role !== 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the team owner can change roles' });
      }

      const [updated] = await ctx.db
        .update(teamMembers)
        .set({ role: input.role })
        .where(and(eq(teamMembers.teamId, input.teamId), eq(teamMembers.userId, input.userId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team member not found' });
      }

      return updated;
    }),
});
