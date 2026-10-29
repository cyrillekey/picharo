import { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const root: FastifyPluginCallbackJsonSchemaToTs = async (
  fastify,
  opts,
): Promise<void> => {
  fastify.get("/", function (request, reply) {
    return { root: true };
  });
};

export default root;
