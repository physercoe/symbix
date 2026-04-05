import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { channelItems, pinnedMessages, messages } from '../db/schema/index.js';

export const channelItemsRouter = router({
  // ── Channel Items (tasks, docs, links, files) ─────────────────

  list: protectedProcedure
    .input(z.object({
      channelId: z.string().uuid(),
      type: z.enum(['task', 'doc', 'link', 'file']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(channelItems.channelId, input.channelId)];
      if (input.type) conditions.push(eq(channelItems.type, input.type));

      return ctx.db
        .select()
        .from(channelItems)
        .where(and(...conditions))
        .orderBy(desc(channelItems.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      channelId: z.string().uuid(),
      type: z.enum(['task', 'doc', 'link', 'file']),
      title: z.string().min(1).max(500),
      content: z.string().optional(),
      url: z.string().optional(),
      status: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(channelItems)
        .values({
          channelId: input.channelId,
          type: input.type,
          title: input.title,
          content: input.content,
          url: input.url,
          status: input.status,
          metadata: input.metadata,
          createdBy: ctx.userId,
        })
        .returning();
      return item;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(500).optional(),
      content: z.string().optional(),
      url: z.string().optional(),
      status: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(channelItems)
        .set(data)
        .where(eq(channelItems.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(channelItems).where(eq(channelItems.id, input.id));
      return { success: true };
    }),

  // ── Pinned Messages ───────────────────────────────────────────

  listPins: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const pins = await ctx.db
        .select({
          id: pinnedMessages.id,
          messageId: pinnedMessages.messageId,
          pinnedBy: pinnedMessages.pinnedBy,
          pinnedAt: pinnedMessages.pinnedAt,
          content: messages.content,
          contentType: messages.contentType,
          senderType: messages.senderType,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        })
        .from(pinnedMessages)
        .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
        .where(eq(pinnedMessages.channelId, input.channelId))
        .orderBy(desc(pinnedMessages.pinnedAt));
      return pins;
    }),

  pin: protectedProcedure
    .input(z.object({ channelId: z.string().uuid(), messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already pinned
      const [existing] = await ctx.db
        .select()
        .from(pinnedMessages)
        .where(and(
          eq(pinnedMessages.channelId, input.channelId),
          eq(pinnedMessages.messageId, input.messageId),
        ))
        .limit(1);

      if (existing) return existing;

      const [pin] = await ctx.db
        .insert(pinnedMessages)
        .values({
          channelId: input.channelId,
          messageId: input.messageId,
          pinnedBy: ctx.userId,
        })
        .returning();
      return pin;
    }),

  unpin: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(pinnedMessages).where(eq(pinnedMessages.id, input.id));
      return { success: true };
    }),
});
