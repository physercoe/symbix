import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { createClerkClient } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { env } from './env.js';
import { redisSub, redis } from './redis.js';
import { db } from './db/index.js';
import { machines, agents, messages } from './db/schema/index.js';

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

interface WsClient {
  ws: WebSocket;
  userId?: string;
  machineId?: string;
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
  if (redisChannel.startsWith('channel:')) {
    const channelId = redisChannel.replace('channel:', '');
    broadcastToChannel(channelId, data);
  } else if (redisChannel.startsWith('machine:')) {
    const machineId = redisChannel.replace('machine:', '');
    // Forward to the machine's WS connection
    for (const client of clients.values()) {
      if (client.machineId === machineId && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  }
});

export async function registerWebSocket(app: FastifyInstance) {
  await app.register(import('@fastify/websocket'));

  app.get('/ws', { websocket: true }, async (socket, req) => {
    // Auth: try JWT first, then API key
    const token = (req.query as Record<string, string>).token;
    const apiKey = (req.query as Record<string, string>).apiKey;

    let userId: string | undefined;
    let machineId: string | undefined;

    if (token) {
      // Human auth via Clerk JWT
      try {
        const payload = await clerk.verifyToken(token);
        userId = payload.sub;
      } catch {
        socket.close(4003, 'Invalid token');
        return;
      }
    } else if (apiKey) {
      // Machine auth via API key
      const [machine] = await db
        .select()
        .from(machines)
        .where(eq(machines.apiKey, apiKey))
        .limit(1);

      if (!machine) {
        socket.close(4003, 'Invalid API key');
        return;
      }

      machineId = machine.id;

      // Update machine status to online
      await db
        .update(machines)
        .set({ status: 'online', lastSeenAt: new Date() })
        .where(eq(machines.id, machineId));

      // Subscribe to machine command channel
      const machineChannel = `machine:${machineId}`;
      if (!redisSubscriptions.has(machineChannel)) {
        await redisSub.subscribe(machineChannel);
        redisSubscriptions.add(machineChannel);
      }
    } else {
      socket.close(4001, 'Missing authentication');
      return;
    }

    const client: WsClient = { ws: socket, userId, machineId, channels: new Set() };
    clients.set(socket, client);

    // Publish presence for human users
    if (userId) {
      await redis.publish('presence', JSON.stringify({ type: 'presence', userId, online: true }));
    }

    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'subscribe': {
            const channelId = msg.channelId as string;
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
            client.channels.delete(msg.channelId as string);
            break;
          }

          case 'typing': {
            // Broadcast typing indicator to other clients in the channel
            const data = JSON.stringify({
              type: 'typing',
              userId: client.userId,
              channelId: msg.channelId,
            });
            broadcastToChannel(msg.channelId as string, data);
            break;
          }

          // Machine → server: agent sends a message to a channel
          case 'agent_message': {
            if (!client.machineId) break;
            const { agentId, channelId, content } = msg as {
              agentId: string;
              channelId: string;
              content: string;
            };

            const [savedMsg] = await db
              .insert(messages)
              .values({
                channelId,
                senderType: 'agent',
                senderId: agentId,
                content,
                contentType: 'text',
              })
              .returning();

            // Broadcast to channel subscribers
            await redis.publish(
              `channel:${channelId}`,
              JSON.stringify({ type: 'new_message', message: savedMsg }),
            );
            break;
          }

          // Machine → server: agent has finished spawning and is active
          case 'agent_spawned': {
            if (!client.machineId) break;
            await db
              .update(agents)
              .set({ status: 'active' })
              .where(eq(agents.id, msg.agentId as string));
            break;
          }

          // Machine → server: agent process has stopped
          case 'agent_stopped': {
            if (!client.machineId) break;
            await db
              .update(agents)
              .set({ status: 'offline' })
              .where(eq(agents.id, msg.agentId as string));
            break;
          }

          // Machine → server: machine reports its own status/metadata
          case 'machine_status': {
            if (!client.machineId) break;
            await db
              .update(machines)
              .set({ metadata: msg.metadata as Record<string, unknown>, lastSeenAt: new Date() })
              .where(eq(machines.id, client.machineId));
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on('close', async () => {
      clients.delete(socket);
      if (client.userId) {
        await redis.publish(
          'presence',
          JSON.stringify({ type: 'presence', userId: client.userId, online: false }),
        );
      }
      if (client.machineId) {
        await db
          .update(machines)
          .set({ status: 'offline' })
          .where(eq(machines.id, client.machineId));
      }
    });
  });
}
