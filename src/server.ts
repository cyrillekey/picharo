// Read the .env file.
import * as dotenv from "dotenv";

// Require the framework
import Fastify from "fastify";

// Require library to exit fastify process, gracefully (if possible)
import closeWithGrace from "close-with-grace";
import fastifyApp from "./app.js";
import { createEventsWorker } from "./consumers/events.js";
import { EVENTS_QUEUE } from "./queues/events.js";
import { config } from "./config/index.js";
dotenv.config();

// Instantiate Fastify with some config
const app = Fastify({
  logger: true,
});

// Register your application as a normal plugin.
app.register(fastifyApp);
const worker = createEventsWorker();
worker.on("ready", () => {
  console.info(
    `[events] worker ready for "${EVENTS_QUEUE}" (concurrency: ${config.queue.concurrency})`,
  );
});
// delay is the number of milliseconds for the graceful close to finish
closeWithGrace(
  { delay: Number(process.env.FASTIFY_CLOSE_GRACE_DELAY || 500) },
  async function ({ err }) {
    if (err) {
      app.log.error(err);
    }
    await worker.close();
    await app.close();
  } as closeWithGrace.CloseWithGraceAsyncCallback,
);

// Start listening.
app.listen(
  {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "0.0.0.0",
  },
  (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  },
);
