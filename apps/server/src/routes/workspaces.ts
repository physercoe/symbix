import { TRPCError } from '@trpc/server';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { workspaces, channels, channelMembers, workspaceMembers, users, teams, teamMembers } from '../db/schema/index.js';
import {
  updateWorkspaceSchema,
  inviteToWorkspaceSchema,
} from '@symbix/shared';
import { recordActivity } from '../services/activity.js';

export const workspacesRouter = router({
  create: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid().optional(),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve teamId: use provided, or find/create default team for user
      let teamId = input.teamId;
      if (!teamId) {
        // Find user's first team
        const [membership] = await ctx.db
          .select({ teamId: teamMembers.teamId })
          .from(teamMembers)
          .where(eq(teamMembers.userId, ctx.userId))
          .limit(1);

        if (membership) {
          teamId = membership.teamId;
        } else {
          // Auto-create a default team for the user
          const [user] = await ctx.db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, ctx.userId))
            .limit(1);

          const teamName = `${user?.name ?? 'User'}'s Team`;
          const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) + '-' + Date.now().toString(36);

          const [newTeam] = await ctx.db
            .insert(teams)
            .values({ name: teamName, slug, ownerId: ctx.userId })
            .returning();

          await ctx.db.insert(teamMembers).values({
            teamId: newTeam.id,
            userId: ctx.userId,
            role: 'owner',
          });

          teamId = newTeam.id;
        }
      }

      const [workspace] = await ctx.db
        .insert(workspaces)
        .values({ teamId, name: input.name, ownerId: ctx.userId })
        .returning();

      // Add creator as workspace member
      await ctx.db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        memberType: 'user',
        userId: ctx.userId,
        role: 'owner',
      });

      // Create default channels and add creator to each
      const defaultChannels = [
        { name: 'general', description: 'General discussion', type: 'public' },
        { name: 'random', description: 'Off-topic chat', type: 'public' },
      ];

      for (const ch of defaultChannels) {
        const [channel] = await ctx.db
          .insert(channels)
          .values({ workspaceId: workspace.id, ...ch })
          .returning();

        await ctx.db.insert(channelMembers).values({
          channelId: channel.id,
          memberType: 'user',
          userId: ctx.userId,
        });
      }

      recordActivity({
        teamId,
        workspaceId: workspace.id,
        actorType: 'user',
        actorId: ctx.userId,
        eventType: 'workspace_create',
        metadata: { workspaceName: input.name },
      });

      return workspace;
    }),

  list: protectedProcedure
    .input(z.object({ teamId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.teamId) {
        // List workspaces for a specific team
        return ctx.db
          .select()
          .from(workspaces)
          .where(eq(workspaces.teamId, input.teamId));
      }

      // List workspaces across all teams the user belongs to
      const memberships = await ctx.db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, ctx.userId));

      const teamIds = memberships.map((m) => m.teamId);

      if (teamIds.length === 0) {
        // Fallback: return workspaces the user owns (for backward compat before teams exist)
        return ctx.db
          .select()
          .from(workspaces)
          .where(eq(workspaces.ownerId, ctx.userId));
      }

      return ctx.db
        .select()
        .from(workspaces)
        .where(inArray(workspaces.teamId, teamIds));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.id))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      return workspace;
    }),

  update: protectedProcedure
    .input(updateWorkspaceSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [existing] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      if (existing.ownerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not workspace owner' });
      }

      const [updated] = await ctx.db
        .update(workspaces)
        .set(data)
        .where(eq(workspaces.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      if (existing.ownerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not workspace owner' });
      }

      await ctx.db.delete(workspaces).where(eq(workspaces.id, input.id));

      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      let members = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId));

      // Auto-add current user if they own the workspace but aren't in the members table
      const currentUserIsMember = members.some((m) => m.userId === ctx.userId);
      if (!currentUserIsMember) {
        const [ws] = await ctx.db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .limit(1);
        if (ws && ws.ownerId === ctx.userId) {
          await ctx.db.insert(workspaceMembers).values({
            workspaceId: input.workspaceId,
            memberType: 'user',
            userId: ctx.userId,
            role: 'owner',
          }).onConflictDoNothing();
          // Re-fetch
          members = await ctx.db
            .select()
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, input.workspaceId));
        }
      }

      // Resolve user names
      const result = [];
      for (const member of members) {
        let userName: string | null = null;
        if (member.userId) {
          const [user] = await ctx.db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, member.userId))
            .limit(1);
          userName = user?.name ?? null;
        }
        result.push({ ...member, userName });
      }
      return result;
    }),

  invite: protectedProcedure
    .input(inviteToWorkspaceSchema)
    .mutation(async () => {
      // Stub
      return { success: true };
    }),
});
