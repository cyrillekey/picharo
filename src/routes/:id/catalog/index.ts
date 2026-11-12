import { isRequestValidated } from "@/hooks";
import { isCatalogEventActive } from "@/utils/holiday";
import type { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import type { MetaPreview } from "stremio-addon-sdk";

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
          },
        },
        required: ["id", "type", "catalogId"],
      },
    },
    handler: async (req) => {
      try {
        const ids = [
          "top-movies-country",
          "top-tv-country",
          "recommendation-movie",
          "recommendation-tv",
          "watchlist-movies",
          "watchlist-series",
        ];
        let metas: MetaPreview[] = [];
        if (ids.includes(req.params.catalogId)) {
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
                  type: a.movie.mediaType == "movie" ? "movie" : "series",
                  description: a.movie.description,
                  poster: a.movie.poster ?? "",
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
                  type: a.movie.mediaType == "movie" ? "movie" : "series",
                  description: a.movie.description,
                  poster: a.movie.poster ?? "",
                }));
              }
              break;
            default:
              break;
          }
        } else {
          const active = isCatalogEventActive(req.params.catalogId, new Date());
          if (active) {
            const movies = await fastify.library.db.orm.public.WatchList.where({
              userId: req.user.id,
            })
              .where((a) =>
                a.movie.every((b) => b.collection.eq(req.params.catalogId)),
              )
              .include("movie")
              .orderBy((a) => a.createdat.desc())
              .all();
            metas = movies.map((a) => ({
              id: a.movie.externalId,
              name: a.movie.title,
              type: a.movie.mediaType == "movie" ? "movie" : "series",
              description: a.movie.description,
              poster: a.movie.poster ?? "",
            }));
          } else {
            metas = [];
          }
        }
        return {
          metas: metas,
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
