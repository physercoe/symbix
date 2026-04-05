import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { agents, agentMemory } from '../db/schema/index.js';
import {
  createAgentSchema,
  updateAgentSchema,
  updateAgentMemorySchema,
} from '@symbix/shared';

export const agentsRouter = router({
  create: protectedProcedure
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .insert(agents)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          roleDescription: input.roleDescription,
          systemPrompt: input.systemPrompt,
          llmProvider: input.llmProvider,
          llmModel: input.llmModel,
          agentClass: input.agentClass,
          config: input.config ?? {},
          capabilities: input.capabilities ?? [],
          status: 'sleeping',
        })
        .returning();

      return agent;
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(agents)
        .where(eq(agents.workspaceId, input.workspaceId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      return agent;
    }),

  update: protectedProcedure
    .input(updateAgentSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [existing] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      const [updated] = await ctx.db
        .update(agents)
        .set(data)
        .where(eq(agents.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      await ctx.db.delete(agents).where(eq(agents.id, input.id));

      return { success: true };
    }),

  updateMemory: protectedProcedure
    .input(updateAgentMemorySchema.extend({ agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { agentId, key, content, metadata } = input;

      const [entry] = await ctx.db
        .insert(agentMemory)
        .values({ agentId, key, content, metadata })
        .onConflictDoUpdate({
          target: [agentMemory.agentId, agentMemory.key],
          set: {
            content,
            metadata,
            updatedAt: new Date(),
          },
        })
        .returning();

      return entry;
    }),

  getMemory: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(agentMemory)
        .where(eq(agentMemory.agentId, input.agentId));
    }),

  wake: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      const [updated] = await ctx.db
        .update(agents)
        .set({ status: 'active' })
        .where(eq(agents.id, input.id))
        .returning();

      return updated;
    }),

  sleep: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      const [updated] = await ctx.db
        .update(agents)
        .set({ status: 'sleeping' })
        .where(eq(agents.id, input.id))
        .returning();

      return updated;
    }),
});
