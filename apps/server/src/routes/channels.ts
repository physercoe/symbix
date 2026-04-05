import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { channels, channelMembers } from '../db/schema/index.js';
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
});
