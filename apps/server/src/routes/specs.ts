import { eq, and, or, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { specs } from '../db/schema/index.js';

const SPEC_TYPES = ['agent', 'workspace'] as const;
const VISIBILITY = ['private', 'workspace', 'public'] as const;

export const specsRouter = router({
  list: protectedProcedure
    .input(z.object({
      specType: z.enum(SPEC_TYPES).optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Show user's own specs + public specs from others
      const conditions = [
        or(
          eq(specs.userId, ctx.userId),
          eq(specs.visibility, 'public'),
        ),
      ];
      if (input.specType) conditions.push(eq(specs.specType, input.specType));
      if (input.category) conditions.push(eq(specs.category, input.category));

      return ctx.db
        .select()
        .from(specs)
        .where(and(...conditions))
        .orderBy(desc(specs.updatedAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [spec] = await ctx.db
        .select()
        .from(specs)
        .where(and(
          eq(specs.id, input.id),
          or(eq(specs.userId, ctx.userId), eq(specs.visibility, 'public')),
        ))
        .limit(1);
      return spec ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      specType: z.enum(SPEC_TYPES),
      name: z.string().min(1).max(200),
      version: z.string().max(20).default('1.0'),
      description: z.string().optional(),
      content: z.record(z.unknown()), // structured JSON
      visibility: z.enum(VISIBILITY).default('private'),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [spec] = await ctx.db
        .insert(specs)
        .values({
          userId: ctx.userId,
          specType: input.specType,
          name: input.name,
          version: input.version,
          description: input.description,
          content: input.content,
          visibility: input.visibility,
          category: input.category,
        })
        .returning();
      return spec;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      version: z.string().max(20).optional(),
      description: z.string().optional(),
      content: z.record(z.unknown()).optional(),
      visibility: z.enum(VISIBILITY).optional(),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(specs)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(specs.id, id), eq(specs.userId, ctx.userId)))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(specs).where(
        and(eq(specs.id, input.id), eq(specs.userId, ctx.userId)),
      );
      return { success: true };
    }),

  // Increment usage count when deploying from spec
  recordUsage: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [spec] = await ctx.db
        .select()
        .from(specs)
        .where(eq(specs.id, input.id))
        .limit(1);
      if (!spec) return null;
      const [updated] = await ctx.db
        .update(specs)
        .set({ usageCount: (spec.usageCount ?? 0) + 1 })
        .where(eq(specs.id, input.id))
        .returning();
      return updated;
    }),
});
