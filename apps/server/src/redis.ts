import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL);
export const redisSub = new Redis(env.REDIS_URL); // dedicated subscriber connection
