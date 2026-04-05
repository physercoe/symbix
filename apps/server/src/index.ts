import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { env } from './env.js';
import { appRouter } from './routes/index.js';
import { createContext } from './trpc.js';
import { registerWebSocket } from './websocket.js';
import { createAgentResponseWorker } from './services/bull.js';
import { processAgentResponse, processAgentSleep } from './workers/agent-response.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// WebSocket (must register before tRPC)
await registerWebSocket(app);

// tRPC
await app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Start BullMQ worker
createAgentResponseWorker(async (job) => {
  if (job.name === 'respond') {
    await processAgentResponse(job);
  } else if (job.name === 'sleep') {
    await processAgentSleep(job);
  }
});

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Symbix server running on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
