import { isRequestValidated } from "@/hooks";
import { type LibraryExtraArgs } from "@/type";
import { decodeSearchString } from "@/utils/shared";
import type { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const libraryRoute: FastifyPluginCallbackJsonSchemaToTs = (
  fastify,
  _opts,
): void => {
  fastify.all(
    "/:type/:videoID/:extraArgs.json",
    {
      preHandler: isRequestValidated,
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
          required: ["id", "type", "videoID", "extraArgs"],
        },
      },
    },
    async (req, _reply) => {
      try {
        const params = decodeSearchString<LibraryExtraArgs>(
          req.params.extraArgs ?? "",
        );
        if (fastify.library.helpers.validateVideoId(req.params.videoID))
          await fastify.events.queue.add("library.event", {
            name: "library.event",
            payload: {
              type: req.params.type,
              userId: req.params.id,
              videoId: req.params.videoID,
              args: params,
            },
            occurredAt: new Date().toISOString(),
          });

        return {
          success: true,
          message: "Success! Library action recorded",
        };
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
