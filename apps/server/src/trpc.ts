import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { users } from './db/schema/index.js';
import { redis } from './redis.js';
import { env } from './env.js';

async function resolveUser(clerkId: string, email?: string, name?: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      clerkId,
      email: email ?? `${clerkId}@clerk.user`,
      name: name ?? 'User',
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();

  if (created) return created.id;

  // Race condition: another request created it first
  const [raced] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return raced?.id ?? null;
}

export async function createContext({ req }: CreateFastifyContextOptions) {
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      userId = await resolveUser(
        payload.sub,
        payload.email as string | undefined,
        payload.name as string | undefined,
      );
    } catch (err) {
      console.error('Clerk verifyToken failed:', err);
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
