import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createClerkClient } from '@clerk/backend';
import { db } from './db/index.js';
import { redis } from './redis.js';
import { env } from './env.js';

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function createContext({ req }: CreateFastifyContextOptions) {
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await clerk.verifyToken(token);
      userId = payload.sub;
    } catch {
      // Invalid token — userId stays null
    }
  }
  return { db, redis, userId };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
