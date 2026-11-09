import { isRequestValidated } from "@/hooks";
import { baseManifest } from "@/utils/shared";
import type { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  fastify.get(
    "/manifest.json",
    {
      preHandler: isRequestValidated,
      schema: {
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
          },
        },
      },
    },
    async function () {
      return baseManifest;
    },
  );
};

export default root;
