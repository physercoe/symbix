import { and, eq, lt, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { messages } from '../db/schema/index.js';
import { sendMessageSchema, listMessagesSchema } from '@symbix/shared';

export const messagesRouter = router({
  send: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const [message] = await ctx.db
        .insert(messages)
        .values({
          channelId: input.channelId,
          senderType: 'user',
          senderId: ctx.userId,
          content: input.content,
          contentType: input.contentType,
          mediaUrl: input.mediaUrl,
          parentId: input.parentId,
        })
        .returning();

      // Publish to Redis for real-time delivery
      await ctx.redis.publish(
        `channel:${input.channelId}`,
        JSON.stringify({ type: 'new_message', message }),
      );

      return message;
    }),

  list: protectedProcedure
    .input(listMessagesSchema)
    .query(async ({ ctx, input }) => {
      const { channelId, cursor, limit } = input;

      const rows = await ctx.db
        .select()
        .from(messages)
        .where(
          cursor
            ? and(eq(messages.channelId, channelId), lt(messages.id, cursor))
            : eq(messages.channelId, channelId),
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const resultRows = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? resultRows[resultRows.length - 1]?.id : undefined;

      return { messages: resultRows, nextCursor };
    }),

  getThread: protectedProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(messages)
        .where(eq(messages.parentId, input.parentId))
        .orderBy(asc(messages.createdAt));
    }),
});
