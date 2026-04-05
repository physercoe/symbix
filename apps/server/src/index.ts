import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { env } from './env.js';
import { appRouter } from './routes/index.js';
import { createContext } from './trpc.js';
import { registerWebSocket } from './websocket.js';
import { createAgentResponseWorker } from './services/bull.js';
import { processAgentResponse, processAgentSleep } from './workers/agent-response.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
await mkdir(UPLOADS_DIR, { recursive: true });

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB
await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/', decorateReply: false });

// WebSocket (must register before tRPC)
await registerWebSocket(app);

// tRPC
await app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// File upload endpoint
app.post('/upload', async (request, reply) => {
  const file = await request.file();
  if (!file) {
    return reply.status(400).send({ error: 'No file uploaded' });
  }

  const ext = extname(file.filename) || '';
  const id = randomUUID();
  const storedName = `${id}${ext}`;
  const buffer = await file.toBuffer();

  await writeFile(join(UPLOADS_DIR, storedName), buffer);

  const url = `/uploads/${storedName}`;
  const mime = file.mimetype;
  let contentType: string = 'file';
  if (mime.startsWith('image/')) contentType = 'image';
  else if (mime.startsWith('video/')) contentType = 'video';
  else if (mime.startsWith('audio/')) contentType = 'audio';

  return { url, contentType, filename: file.filename, size: buffer.length };
});

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
