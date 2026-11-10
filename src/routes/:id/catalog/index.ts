import { isRequestValidated } from "@/hooks";
import type { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const route: FastifyPluginCallbackJsonSchemaToTs = (fastify, _opts) => {
  fastify.route({
    method: "GET",
    url: "/:type/:catalogId.json",
    preHandler: isRequestValidated,
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
          },
          catalogId: {
            type: "string",
            enum: [],
          },
        },
        required: ["id", "type", "catalogId"],
      },
    },
    handler: (req) => {
      try {
        return {
          metas: [],
        };
      } catch (error) {
        req.log.error(error);
        return {
          metas: [],
        };
      }
    },
  });
};
export default route;
