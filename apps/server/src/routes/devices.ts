import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';

export const devicesRouter = router({
  register: publicProcedure
    .input(z.object({ hardwareId: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      return {
        id: 'mock-device-id',
        hardwareId: input.hardwareId,
        name: input.name,
        status: 'offline',
      };
    }),

  sendCommand: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        command: z.string(),
        payload: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async () => {
      return { success: true, sentAt: new Date().toISOString() };
    }),

  getTelemetry: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async () => {
      return {
        temperature: 22.5,
        humidity: 45,
        battery: 87,
        lastUpdate: new Date().toISOString(),
      };
    }),

  listEvents: publicProcedure
    .input(z.object({ agentId: z.string(), limit: z.number().default(20) }))
    .query(async () => {
      return [];
    }),
});
