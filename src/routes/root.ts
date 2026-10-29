import { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import baseManifest from "@/utils/globals";

const root: FastifyPluginCallbackJsonSchemaToTs = async (
  fastify,
  opts,
): Promise<void> => {
  fastify.get("/", function (request, reply) {
    return baseManifest;
  });
};

export default root;
