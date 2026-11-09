import fp from "fastify-plugin";
import {
  Queue,
  type ConnectionOptions,
  type Job,
  type JobsOptions,
} from "bullmq";
import { config } from "../config/index.js";
import {
  configureRedisClientFactory,
  redisConnectionOptions,
} from "../queues/connection.js";
import {
  EVENTS_QUEUE,
  type EventJobData,
  type EventName,
  type EventPayloads,
} from "../queues/events.js";

export interface EventsService {
  // Raw queue, useful for administration (counts, retries, draining, ...).
  readonly queue: Queue<EventJobData, void, EventName>;
  emit<K extends EventName>(
    name: K,
    payload: EventPayloads[K],
    options?: JobsOptions,
  ): Promise<Job<EventJobData, void, EventName>>;
}

export interface BullMqPluginOptions {
  // Override the Redis connection. Primarily useful in tests.
  connection?: ConnectionOptions;
  // Override the configured queue namespace. Primarily useful in tests.
  prefix?: string;
}

export default fp<BullMqPluginOptions>(
  async (fastify, opts) => {
    configureRedisClientFactory();

    const queue = new Queue<EventJobData, void, EventName>(EVENTS_QUEUE, {      
      connection: opts.connection ?? redisConnectionOptions(),
      prefix: opts.prefix ?? config.queue.prefix,
      defaultJobOptions: {
        attempts: config.queue.attempts,
        backoff: {
          type: "exponential",
          delay: config.queue.backoffMs,
        },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 5_000 },
      },
    });

    const events: EventsService = {
      queue,
      async emit(name, payload, options) {
        const data = {
          name,
          payload,
          occurredAt: new Date().toISOString(),
        } as EventJobData;

        return queue.add(name, data, options);
      },
    };

    fastify.decorate("events", events);

    queue.on("error", (error) => {
      fastify.log.error({ err: error }, "events queue error");
    });

    fastify.addHook("onClose", async () => {
      await queue.close();
    });
  },
  { name: "bullmq" },
);

declare module "fastify" {
  interface FastifyInstance {
    events: EventsService;
  }
}
