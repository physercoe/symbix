import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { createClerkClient } from '@clerk/backend';
import { env } from './env.js';
import { redisSub, redis } from './redis.js';

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

interface WsClient {
  ws: WebSocket;
  userId: string;
  channels: Set<string>;
}

const clients = new Map<WebSocket, WsClient>();

// Track which Redis channels we're subscribed to
const redisSubscriptions = new Set<string>();

function broadcastToChannel(channelId: string, data: string) {
  for (const client of clients.values()) {
    if (client.channels.has(channelId) && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

// Listen for Redis pub/sub messages and forward to WebSocket clients
redisSub.on('message', (redisChannel: string, data: string) => {
  // Redis channels are like "channel:<uuid>"
  const channelId = redisChannel.replace('channel:', '');
  broadcastToChannel(channelId, data);
});

export async function registerWebSocket(app: FastifyInstance) {
  await app.register(import('@fastify/websocket'));

  app.get('/ws', { websocket: true }, async (socket, req) => {
    const token = (req.query as Record<string, string>).token;

    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }

    let userId: string;
    try {
      const payload = await clerk.verifyToken(token);
      userId = payload.sub;
    } catch {
      socket.close(4003, 'Invalid token');
      return;
    }

    const client: WsClient = { ws: socket, userId, channels: new Set() };
    clients.set(socket, client);

    // Publish presence
    await redis.publish('presence', JSON.stringify({ type: 'presence', userId, online: true }));

    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'subscribe': {
            const channelId = msg.channelId;
            client.channels.add(channelId);

            // Subscribe to Redis channel if not already
            const redisChannel = `channel:${channelId}`;
            if (!redisSubscriptions.has(redisChannel)) {
              await redisSub.subscribe(redisChannel);
              redisSubscriptions.add(redisChannel);
            }
            break;
          }

          case 'unsubscribe': {
            client.channels.delete(msg.channelId);
            break;
          }

          case 'typing': {
            // Broadcast typing indicator to other clients in the channel
            const data = JSON.stringify({
              type: 'typing',
              userId: client.userId,
              channelId: msg.channelId,
            });
            broadcastToChannel(msg.channelId, data);
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on('close', async () => {
      clients.delete(socket);
      await redis.publish('presence', JSON.stringify({ type: 'presence', userId, online: false }));
    });
  });
}
