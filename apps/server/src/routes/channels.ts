import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { channels, channelMembers, agents } from '../db/schema/index.js';
import {
  createChannelSchema,
  updateChannelSchema,
  addChannelMemberSchema,
} from '@symbix/shared';

export const channelsRouter = router({
  create: protectedProcedure
    .input(createChannelSchema)
    .mutation(async ({ ctx, input }) => {
      const [channel] = await ctx.db
        .insert(channels)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          type: input.type,
        })
        .returning();

      // Add creator as a channel member
      await ctx.db.insert(channelMembers).values({
        channelId: channel.id,
        memberType: 'user',
        userId: ctx.userId,
      });

      return channel;
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(channels)
        .where(eq(channels.workspaceId, input.workspaceId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [channel] = await ctx.db
        .select()
        .from(channels)
        .where(eq(channels.id, input.id))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      }

      return channel;
    }),

  update: protectedProcedure
    .input(updateChannelSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [existing] = await ctx.db
        .select()
        .from(channels)
        .where(eq(channels.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      }

      const [updated] = await ctx.db
        .update(channels)
        .set(data)
        .where(eq(channels.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(channels)
        .where(eq(channels.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      }

      await ctx.db.delete(channels).where(eq(channels.id, input.id));

      return { success: true };
    }),

  addMember: protectedProcedure
    .input(addChannelMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .insert(channelMembers)
        .values({
          channelId: input.channelId,
          memberType: input.memberType,
          userId: input.userId,
          agentId: input.agentId,
        })
        .returning();

      return member;
    }),

  removeMember: protectedProcedure
    .input(z.object({ channelId: z.string().uuid(), memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(channelMembers)
        .where(eq(channelMembers.id, input.memberId));

      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(channelMembers)
        .where(eq(channelMembers.channelId, input.channelId));
    }),

  // Open or create a DM channel between the current user and an agent
  openDM: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid(), agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, agentId } = input;

      // Look up the agent name
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);
      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      // Find existing DM channel where both user and agent are members
      const dmChannels = await ctx.db
        .select()
        .from(channels)
        .where(and(eq(channels.workspaceId, workspaceId), eq(channels.type, 'dm')));

      for (const ch of dmChannels) {
        const members = await ctx.db
          .select()
          .from(channelMembers)
          .where(eq(channelMembers.channelId, ch.id));
        const hasUser = members.some((m) => m.memberType === 'user' && m.userId === ctx.userId);
        const hasAgent = members.some((m) => m.memberType === 'agent' && m.agentId === agentId);
        if (hasUser && hasAgent && members.length === 2) {
          return ch;
        }
      }

      // Create new DM channel
      const [channel] = await ctx.db
        .insert(channels)
        .values({
          workspaceId,
          name: agent.name,
          description: `DM with ${agent.name}`,
          type: 'dm',
        })
        .returning();

      await ctx.db.insert(channelMembers).values([
        { channelId: channel.id, memberType: 'user' as const, userId: ctx.userId },
        { channelId: channel.id, memberType: 'agent' as const, agentId },
      ]);

      return channel;
    }),
});
