import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { userItems } from '../db/schema/index.js';

const USER_ITEM_TYPES = ['note', 'saved', 'snippet'] as const;

export const userItemsRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.enum(USER_ITEM_TYPES).optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(userItems.userId, ctx.userId)];
      if (input.type) conditions.push(eq(userItems.type, input.type));
      if (input.category) conditions.push(eq(userItems.category, input.category));

      return ctx.db
        .select()
        .from(userItems)
        .where(and(...conditions))
        .orderBy(desc(userItems.updatedAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(userItems)
        .where(and(eq(userItems.id, input.id), eq(userItems.userId, ctx.userId)))
        .limit(1);
      return item ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      type: z.enum(USER_ITEM_TYPES),
      title: z.string().min(1).max(500),
      content: z.string().optional(),
      language: z.string().max(50).optional(),
      sourceChannelId: z.string().uuid().optional(),
      sourceMessageId: z.string().uuid().optional(),
      category: z.string().max(100).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(userItems)
        .values({
          userId: ctx.userId,
          type: input.type,
          title: input.title,
          content: input.content,
          language: input.language,
          sourceChannelId: input.sourceChannelId,
          sourceMessageId: input.sourceMessageId,
          category: input.category,
          metadata: input.metadata,
        })
        .returning();
      return item;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(500).optional(),
      content: z.string().optional(),
      language: z.string().max(50).optional(),
      category: z.string().max(100).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(userItems)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(userItems.id, id), eq(userItems.userId, ctx.userId)))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(userItems).where(
        and(eq(userItems.id, input.id), eq(userItems.userId, ctx.userId)),
      );
      return { success: true };
    }),

  // Shortcut: save a message as a personal bookmark
  saveMessage: protectedProcedure
    .input(z.object({
      channelId: z.string().uuid(),
      messageId: z.string().uuid(),
      content: z.string(),
      senderName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const title = input.content.slice(0, 100) + (input.content.length > 100 ? '...' : '');
      const [item] = await ctx.db
        .insert(userItems)
        .values({
          userId: ctx.userId,
          type: 'saved',
          title,
          content: input.content,
          sourceChannelId: input.channelId,
          sourceMessageId: input.messageId,
          metadata: input.senderName ? { senderName: input.senderName } : undefined,
        })
        .returning();
      return item;
    }),
});
