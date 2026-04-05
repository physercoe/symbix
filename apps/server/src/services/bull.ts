import { Queue, Worker } from 'bullmq';
import { env } from '../env.js';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port) || 6379,
};

export const agentResponseQueue = new Queue('agent-response', { connection });

export function createAgentResponseWorker(
  processor: Parameters<typeof Worker>[1],
) {
  return new Worker('agent-response', processor, { connection, concurrency: 5 });
}
