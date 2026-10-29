import { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const libraryRoutes: FastifyPluginCallbackJsonSchemaToTs<{
  SerializerSchemaOptions: {
    deserialize: [
      {
        pattern: { type: "string"; format: "date-time" };
        output: Date | undefined | null;
      },
    ];
  };
}> = (fastify): void => {
  fastify.route({
    method: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    url: "/:type/:videoId/:extraArgs.json",
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
            enum: ["movie", "series", "channel", "tv"],
          },
          extraArgs: {
            type: "string",
          },
        },
      },
    },
    handler: async function (request, reply) {
      try {
        request.log.info(request.params);
        return {
          success: true,
          message: "success",
        };
      } catch (error) {
        request.log.error(error);
        return reply
          .code(500)
          .send({ success: false, message: "Something went wrong" });
      }
    },
  });
};

export default libraryRoutes;
