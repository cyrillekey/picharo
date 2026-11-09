import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { config } from "../config.js";
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

export type EventHandler<K extends EventName> = (
  payload: EventPayloads[K],
  job: Job<EventJobData, void, EventName>,
) => Promise<void>;

export type EventHandlers = {
  [K in EventName]: EventHandler<K>;
};

export interface EventsLogger {
  info(message: string): void;
  error(message: string): void;
}

// Replace these with the real side effects for each event.
export const defaultEventHandlers: EventHandlers = {
  "user.created": async () => {
    // TODO: send a welcome email or provision defaults for the new account.
  },
  "user.email-verified": async () => {
    // TODO: run the actions that should follow email verification.
  },
  "user.password-reset-requested": async () => {
    // TODO: notify the user or record the request.
  },
};

export interface EventsWorkerOptions {
  // Override the Redis connection. Primarily useful in tests.
  connection?: ConnectionOptions;
  // Override the configured queue namespace. Primarily useful in tests.
  prefix?: string;
  // Number of jobs processed concurrently.
  concurrency?: number;
  // Replace or extend the default handlers.
  handlers?: Partial<EventHandlers>;
  logger?: EventsLogger;
}

type AnyEventHandler = (
  payload: EventPayloads[EventName],
  job: Job<EventJobData, void, EventName>,
) => Promise<void>;

export function createEventsWorker(
  options: EventsWorkerOptions = {},
): Worker<EventJobData, void, EventName> {
  configureRedisClientFactory();

  const handlers = { ...defaultEventHandlers, ...options.handlers };
  const logger = options.logger ?? console;

  const worker = new Worker<EventJobData, void, EventName>(
    EVENTS_QUEUE,
    async (job) => {
      // The handler lookup is safe because `handlers` is keyed by EventName.
      const handler = handlers[job.data.name] as AnyEventHandler | undefined;

      if (!handler) {
        throw new Error(`No handler registered for event "${job.data.name}"`);
      }

      await handler(job.data.payload, job);
    },
    {
      connection: options.connection ?? redisConnectionOptions(),
      prefix: options.prefix ?? config.queue.prefix,
      concurrency: options.concurrency ?? config.queue.concurrency,
    },
  );

  worker.on("completed", (job) => {
    logger.info(`[events] completed ${job.name} (${job.id})`);
  });

  worker.on("failed", (job, error) => {
    logger.error(
      `[events] failed ${job?.name ?? "unknown"} (${job?.id ?? "unknown"}): ${error.message}`,
    );
  });

  worker.on("error", (error) => {
    logger.error(`[events] worker error: ${error.message}`);
  });

  return worker;
}
