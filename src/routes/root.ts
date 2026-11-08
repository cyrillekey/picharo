import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/health", async function (request, reply) {
    return { root: true };
  });
  fastify.get("/manifest.json", async function () {
    return {
      id: "org.picharo.stremio",
      name: "Picharo addon",
    };
  });
};

export default root;
