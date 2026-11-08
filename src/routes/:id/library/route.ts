import { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const libraryRoute: FastifyPluginCallbackJsonSchemaToTs = (
  fastify,
  opts,
): void => {
  fastify.all(
    "/:type/:videoID:/:extraArgs.json",
    {
      schema: {
        consumes: ["application/json"],
        produces: ["application/json"],
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            type: {
              type: "string",
              enum: ["tv", "movie", "series", "channel"],
            },
            videoID: {
              type: "string",
            },
            extraArgs: {
              type: "string",
            },
          },
        },
      },
    },
    (req, reply) => {},
  );
};

export default libraryRoute;
