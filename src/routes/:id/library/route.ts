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
        response: {
          default: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
              },
              message: {
                type: "string",
              },
              id: {
                type: "string",
              },
            },
          },
        },
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
    async (req, reply) => {
      try {
      } catch (error) {
        req.log.error(error);
        return {
          success: false,
          message: "Error! Could not validate request",
        };
      }
    },
  );
};

export default libraryRoute;
