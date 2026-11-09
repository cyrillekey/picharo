import "dotenv/config";
import closeWithGrace from "close-with-grace";
import { config } from "./config.js";
import { createEventsWorker } from "./consumers/events.js";
import { EVENTS_QUEUE } from "./queues/events.js";

const worker = createEventsWorker();

worker.on("ready", () => {
  console.info(
    `[events] worker ready for "${EVENTS_QUEUE}" (concurrency: ${config.queue.concurrency})`,
  );
});

closeWithGrace(
  { delay: Number(process.env.FASTIFY_CLOSE_GRACE_DELAY || 5_000) },
  async ({ signal, err }) => {
    if (err) {
      console.error(err);
    }

    console.info(
      `[events] shutting down worker (signal: ${signal ?? "manual"})`,
    );
    await worker.close();
  },
);
