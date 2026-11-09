import { baseManifest } from "@/utils/shared";
import type { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  fastify.get("/health", async function () {
    return { root: true };
  });
  fastify.get("/manifest.json", async function () {
    return baseManifest;
  });
};

export default root;
