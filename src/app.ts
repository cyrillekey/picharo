import * as path from "node:path";
import type { AutoloadPluginOptions } from "@fastify/autoload";
import AutoLoad from "@fastify/autoload";
import type { FastifyPluginAsync } from "fastify";
import { fileURLToPath } from "node:url";
import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  // Place here your custom code!
  fastify.withTypeProvider<
    JsonSchemaToTsProvider<{
      SerializerSchemaOptions: {
        deserialize: [
          { pattern: { type: "string"; format: "date-time" }; output: Date },
        ];
      };
    }>
  >();
  fastify.register(fastifyCors);
  fastify.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Picharo API",
        version: "1.0.0",
        license: {
          name: "MIT",
          identifier: "MIT",
          url: "https://opensource.org/license/mit/",
        },
      },
      tags: [],
    },
  });
  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application

  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: opts,
    forceESM: true,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these

  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: opts,
    forceESM: true,
  });
};

export default app;
export { app, options };
