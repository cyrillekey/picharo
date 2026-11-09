import { Worker, type ConnectionOptions, type Job } from "bullmq";
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
import type { FastifyInstance } from "fastify";

export type EventHandler<K extends EventName> = (
  app: FastifyInstance,
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
  "library.event": async (app, args) => {
    const media = app.library.helpers.parseMovieId(args.videoId);
    if (!media) {
      // pass
      app.log.warn(`${args.videoId} not valid media id for ingestion`);
    } else {
      const existsInDb = await app.library.db.orm.public.Movie.where({
        externalId: media.movieId,
      })
        .select("id")
        .first();
      if (!existsInDb?.id) {
        const details = await app.library.helpers.tmdb.findMedia(media.movieId);
        if (details) {
          const movie = await app.library.db.orm.public.Movie.create({
            externalId: details!.imdb_id,
            averagevote: details.vote_average,
            description: details.overview,
            title: details.title,
            languages: details.spoken_languages.map((a) => a.english_name),
            mediaType: details.mediad_type ?? "movie",
            originalLanguage: details.original_language,
            popularity: details.popularity,
            releaseDate: details.release_date,
          });
          await app.library.db.orm.public.Genre.createAll(
            details.genres.map((a) => ({
              id: a.id,
              name: a.name,
            })),
            {
              onConflict: "skip",
            },
          );
          await app.library.db.orm.public.MovieGenre.createAll(
            details.genres.map((a) => ({
              genreId: a.id,
              movieId: movie.id,
            })),
          );
        }
      }

      switch (args.args?.action) {
        case "watched":
          {
            // history exits
            const watched = await app.library.db.orm.public.WatchHistory.where({
              userId: args.userId,
            })
              .where((b) =>
                b.movie.every((b) => b.externalId.eq(media.movieId)),
              )
              .first();
            if (watched && watched.status != "full") {
              // pass
            } else {
              // pass
            }
          }
          break;
        case "unwatched":
          break;
        default:
        // PASS
        // TODO: impelement default handler
      }
    }
  },
  "player.event": async () => {},
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
  app: FastifyInstance,
  payload: EventPayloads[EventName],
  job: Job<EventJobData, void, EventName>,
) => Promise<void>;

export function createEventsWorker(
  app: FastifyInstance,
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

      await handler(app, job.data.payload, job);
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
