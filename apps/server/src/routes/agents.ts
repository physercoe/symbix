import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { agents, agentMemory, workspaceMembers, channelMembers, channels, workspaces } from '../db/schema/index.js';
import {
  createAgentSchema,
  updateAgentSchema,
  updateAgentMemorySchema,
  spawnAgentSchema,
  deployAgentSchema,
} from '@symbix/shared';

export const agentsRouter = router({
  create: protectedProcedure
    .input(createAgentSchema.extend({
      teamId: z.string().uuid().optional(),
      workspaceId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve teamId: use directly if provided, else derive from workspaceId
      let teamId = input.teamId;
      if (!teamId && input.workspaceId) {
        const [ws] = await ctx.db
          .select({ teamId: workspaces.teamId })
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .limit(1);
        teamId = ws?.teamId;
      }
      if (!teamId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'teamId or workspaceId is required' });
      }

      const [agent] = await ctx.db
        .insert(agents)
        .values({
          teamId,
          name: input.name,
          roleDescription: input.roleDescription,
          systemPrompt: input.systemPrompt,
          llmProvider: input.llmProvider,
          llmModel: input.llmModel,
          llmBaseUrl: input.llmBaseUrl,
          llmApiKey: input.llmApiKey,
          agentClass: input.agentClass,
          agentType: input.agentType,
          machineId: input.machineId,
          config: input.config ?? {},
          capabilities: input.capabilities ?? [],
          status: 'sleeping',
        })
        .returning();

      return agent;
    }),

  list: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid().optional(),
      workspaceId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.workspaceId) {
        // List agents deployed to a specific workspace (via workspace_members)
        const deployed = await ctx.db
          .select({ agent: agents })
          .from(workspaceMembers)
          .innerJoin(agents, eq(agents.id, workspaceMembers.agentId))
          .where(
            and(
              eq(workspaceMembers.workspaceId, input.workspaceId),
              eq(workspaceMembers.memberType, 'agent'),
            ),
          );
        return deployed.map((d) => d.agent);
      }

      if (input.teamId) {
        // List all agents belonging to the team
        return ctx.db
          .select()
          .from(agents)
          .where(eq(agents.teamId, input.teamId));
      }

      // Fallback: return empty if neither provided
      return [];
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

  // Deploy an agent to a workspace (add to workspace_members + all public channels)
  deploy: protectedProcedure
    .input(deployAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(eq(agents.id, input.agentId))
        .limit(1);

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      // Add to workspace_members
      await ctx.db
        .insert(workspaceMembers)
        .values({
          workspaceId: input.workspaceId,
          memberType: 'agent',
          agentId: input.agentId,
          role: 'member',
          config: input.config ?? {},
        })
        .onConflictDoNothing();

      // Auto-add to all public channels in the workspace
      const publicChannels = await ctx.db
        .select()
        .from(channels)
        .where(and(eq(channels.workspaceId, input.workspaceId), eq(channels.type, 'public')));

      for (const channel of publicChannels) {
        await ctx.db
          .insert(channelMembers)
          .values({
            channelId: channel.id,
            memberType: 'agent',
            agentId: input.agentId,
          })
          .onConflictDoNothing();
      }

      return { success: true, agentId: input.agentId, workspaceId: input.workspaceId };
    }),

  // Remove agent from a workspace
  undeploy: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Remove from workspace_members
      await ctx.db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.agentId, input.agentId),
          ),
        );

      // Remove from all channels in this workspace
      const wsChannels = await ctx.db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.workspaceId, input.workspaceId));

      for (const ch of wsChannels) {
        await ctx.db
          .delete(channelMembers)
          .where(
            and(
              eq(channelMembers.channelId, ch.id),
              eq(channelMembers.agentId, input.agentId),
            ),
          );
      }

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

  spawn: protectedProcedure
    .input(spawnAgentSchema.extend({
      teamId: z.string().uuid().optional(),
      workspaceId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve teamId: use directly if provided, else derive from workspaceId
      let teamId = input.teamId;
      if (!teamId && input.workspaceId) {
        const [ws] = await ctx.db
          .select({ teamId: workspaces.teamId })
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .limit(1);
        teamId = ws?.teamId;
      }
      if (!teamId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'teamId or workspaceId is required' });
      }

      const [agent] = await ctx.db
        .insert(agents)
        .values({
          teamId,
          name: input.name,
          agentType: input.agentType,
          machineId: input.machineId,
          roleDescription: '',
          systemPrompt: '',
          config: input.config ?? {},
          status: 'sleeping',
        })
        .returning();

      // Send spawn command to the machine via Redis pub/sub
      await ctx.redis.publish(
        `machine:${input.machineId}`,
        JSON.stringify({
          type: 'spawn_agent',
          agentId: agent.id,
          config: { adapter: input.adapter, ...input.config },
        }),
      );

      return agent;
    }),
});
