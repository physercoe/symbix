import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { workspaceItems } from '../db/schema/index.js';

const WORKSPACE_ITEM_TYPES = ['doc', 'file', 'link', 'template'] as const;

export const workspaceItemsRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      type: z.enum(WORKSPACE_ITEM_TYPES).optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(workspaceItems.workspaceId, input.workspaceId)];
      if (input.type) conditions.push(eq(workspaceItems.type, input.type));
      if (input.category) conditions.push(eq(workspaceItems.category, input.category));

      return ctx.db
        .select()
        .from(workspaceItems)
        .where(and(...conditions))
        .orderBy(desc(workspaceItems.updatedAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(workspaceItems)
        .where(eq(workspaceItems.id, input.id))
        .limit(1);
      return item ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      type: z.enum(WORKSPACE_ITEM_TYPES),
      title: z.string().min(1).max(500),
      content: z.string().optional(),
      url: z.string().optional(),
      category: z.string().max(100).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(workspaceItems)
        .values({
          workspaceId: input.workspaceId,
          type: input.type,
          title: input.title,
          content: input.content,
          url: input.url,
          category: input.category,
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
      category: z.string().max(100).optional(),
      status: z.enum(['active', 'archived']).optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(workspaceItems)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(workspaceItems.id, id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(workspaceItems).where(eq(workspaceItems.id, input.id));
      return { success: true };
    }),
});
