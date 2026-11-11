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
    async function (req, rep) {
      try {
        const user = req.user;
        const catalog = fastify.library.helpers.catalogBuilder({
          country: user.country,
        });
        const manifest = {
          ...baseManifest,
          catalogs: catalog,
          behaviorHints: {
            configurable: true,
            epgProvider: true,
            configurationRequired: false,
          },
        };
        return manifest;
      } catch (error) {
        req.log.error(error);
        return rep.redirect("/configure");
      }
    },
  );
};

export default root;
