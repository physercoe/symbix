import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { router, protectedProcedure } from '../trpc.js';
import { machines } from '../db/schema/index.js';
import { registerMachineSchema, updateMachineSchema } from '@symbix/shared';

export const machinesRouter = router({
  register: protectedProcedure
    .input(registerMachineSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate a unique API key for this machine
      const apiKey = `sym_${randomBytes(32).toString('hex')}`;

      const [machine] = await ctx.db
        .insert(machines)
        .values({
          workspaceId: input.workspaceId,
          name: input.name,
          machineType: input.machineType,
          apiKey,
          metadata: input.metadata ?? {},
        })
        .returning();

      return machine;
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(machines)
        .where(eq(machines.workspaceId, input.workspaceId));
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
