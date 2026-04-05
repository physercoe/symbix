import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { workspaces } from '../db/schema/index.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteToWorkspaceSchema,
} from '@symbix/shared';

export const workspacesRouter = router({
  create: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .insert(workspaces)
        .values({ name: input.name, ownerId: ctx.userId })
        .returning();
      return workspace;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, ctx.userId));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.id))
        .limit(1);

      if (!workspace) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      return workspace;
    }),

  update: protectedProcedure
    .input(updateWorkspaceSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [existing] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      if (existing.ownerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not workspace owner' });
      }

      const [updated] = await ctx.db
        .update(workspaces)
        .set(data)
        .where(eq(workspaces.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      if (existing.ownerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not workspace owner' });
      }

      await ctx.db.delete(workspaces).where(eq(workspaces.id, input.id));

      return { success: true };
    }),

  invite: protectedProcedure
    .input(inviteToWorkspaceSchema)
    .mutation(async () => {
      // Stub — no workspace_members table yet
      return { success: true };
    }),
});
