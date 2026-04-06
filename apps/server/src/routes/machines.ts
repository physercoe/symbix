import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { router, protectedProcedure } from '../trpc.js';
import { machines, workspaces } from '../db/schema/index.js';
import { registerMachineSchema, updateMachineSchema } from '@symbix/shared';

export const machinesRouter = router({
  register: protectedProcedure
    .input(registerMachineSchema.extend({
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

      // Generate a unique API key for this machine
      const apiKey = `sym_${randomBytes(32).toString('hex')}`;

      const [machine] = await ctx.db
        .insert(machines)
        .values({
          teamId,
          name: input.name,
          machineType: input.machineType,
          apiKey,
          metadata: input.metadata ?? {},
        })
        .returning();

      return machine;
    }),

  list: protectedProcedure
    .input(z.object({
      teamId: z.string().uuid().optional(),
      workspaceId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let teamId = input.teamId;

      // Backward compat: resolve teamId from workspaceId if only workspaceId provided
      if (!teamId && input.workspaceId) {
        const [ws] = await ctx.db
          .select({ teamId: workspaces.teamId })
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .limit(1);
        teamId = ws?.teamId;
      }

      if (!teamId) return [];

      return ctx.db
        .select()
        .from(machines)
        .where(eq(machines.teamId, teamId));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [machine] = await ctx.db
        .select()
        .from(machines)
        .where(eq(machines.id, input.id))
        .limit(1);

      if (!machine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Machine not found' });
      }

      return machine;
    }),

  update: protectedProcedure
    .input(updateMachineSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [updated] = await ctx.db
        .update(machines)
        .set(data)
        .where(eq(machines.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Machine not found' });
      }

      return updated;
    }),

  regenerateApiKey: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = `sym_${randomBytes(32).toString('hex')}`;

      const [updated] = await ctx.db
        .update(machines)
        .set({ apiKey })
        .where(eq(machines.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Machine not found' });
      }

      return updated;
    }),

  deregister: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(machines).where(eq(machines.id, input.id));
      return { success: true };
    }),
});
