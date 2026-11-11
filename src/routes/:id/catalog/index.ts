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
            enum: [
              "top-movies-country",
              "top-tv-country",
              "recommendation-movie",
              "recommendation-tv",
              "watchlist-movies",
              "watchlist-series",
            ],
          },
        },
        required: ["id", "type", "catalogId"],
      },
    },
    handler: async (req) => {
      try {
        let metas: { id: string; type: string; name: string }[] = [];
        switch (req.params.catalogId) {
          case "watchlist-movies":
            {
              const movies =
                await fastify.library.db.orm.public.WatchList.where({
                  userId: req.user.id,
                })
                  .where((a) => a.movie.every((b) => b.mediaType.eq("movie")))
                  .include("movie")
                  .orderBy((a) => a.createdat.desc())
                  .all();
              metas = movies.map((a) => ({
                id: a.movie.externalId,
                name: a.movie.title,
                type: a.movie.mediaType == "movie" ? "movie":"series",
                description: a.movie.description,
              }));
            }
            break;
          case "watchlist-series":
            {
              const movies =
                await fastify.library.db.orm.public.WatchList.where({
                  userId: req.user.id,
                })
                  .where((a) => a.movie.every((b) => b.mediaType.eq("tv")))
                  .include("movie")
                  .orderBy((a) => a.createdat.desc())
                  .all();
              metas = movies.map((a) => ({
                id: a.movie.externalId,
                name: a.movie.title,
                type: a.movie.mediaType == "movie" ? "movie":"series",
                description: a.movie.description,
              }));
            }
            break;
          default:
            break;
        }
        return {
          metas: metas
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
