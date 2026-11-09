import {
  RedisConnection,
  createIORedisClient,
  type RedisOptions,
} from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config/index.js";

let clientFactoryConfigured = false;

/**
 * BullMQ loads `ioredis` with `require`, which is not available in this
 * project's ESM build. Register a client factory that creates the client from
 * the ESM import instead. BullMQ then owns the client and closes it when the
 * queue or worker is closed.
 */
export function configureRedisClientFactory(): void {
  if (clientFactoryConfigured) {
    return;
  }

  clientFactoryConfigured = true;

  RedisConnection.clientFactory = (options: RedisOptions) => {
    const { url, ...rest } = options;
    const client = url ? new Redis(url, rest) : new Redis(rest);

    return createIORedisClient(client);
  };
}

/**
 * Build BullMQ connection options from the environment.
 *
 * BullMQ requires `maxRetriesPerRequest` to be `null` so that blocking
 * commands are not aborted while it waits for work.
 */
export function redisConnectionOptions(): RedisOptions {
  configureRedisClientFactory();

  if (config.redis.url) {
    return {
      url: config.redis.url,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    username: config.redis.username || undefined,
    password: config.redis.password || undefined,
    db: config.redis.db,
    tls: config.redis.tls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
