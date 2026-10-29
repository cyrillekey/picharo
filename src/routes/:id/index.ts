import { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const index: FastifyPluginCallbackJsonSchemaToTs<{
  SerializerSchemaOptions: {
    deserialize: [
      {
        pattern: { type: "string"; format: "date-time" };
        output: Date | undefined | null;
      },
    ];
  };
}> = (fastify): void => {
  fastify.get("/manso", async function (request, reply) {
    return "this is an example";
  });
};

export default index;
