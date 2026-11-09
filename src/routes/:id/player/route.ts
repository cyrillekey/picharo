import { type PlayerExtraArgs } from "@/type";
import { decodeSearchString } from "@/utils/shared";
import type { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const playerRoute: FastifyPluginCallbackJsonSchemaToTs = (
  fastify,
  _opts,
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
          required: ["id", "type", "videoID", "extraArgs"],
        },
      },
    },
    async (req, _reply) => {
      try {
        const params = decodeSearchString<PlayerExtraArgs>(
          req.params.extraArgs ?? "",
        );
        await fastify.events.queue.add("player.event", {
          name: "player.event",
          occurredAt: new Date().toISOString(),
          payload: {
            type: req.params.type,
            userId: req.params.id,
            videoId: req.params.videoID,
            args: params,
          },
        });
        return {
          success: true,
          message: "Success! Video added to library",
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

export default playerRoute;
