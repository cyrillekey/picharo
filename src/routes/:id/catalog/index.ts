import { isRequestValidated } from "@/hooks";
import type { Models } from "@/prisma/contract";
import { isCatalogEventActive } from "@/utils/holiday";
import type { FastifyPluginCallbackJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import dayjs from "dayjs";

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
        const awardsIds = [
          "summer-blockbusters",
          "awards-season",
          "golden-globes",
          "sundance",
          "bafta",
          "berlinale",
          "oscars",
          "sxsw",
          "cannes",
          "tribeca",
          "venice",
          "tiff",
          "emmys",
        ];
        let movies: Partial<Models.public_Movie>[] = [];
        if (ids.includes(req.params.catalogId)) {
          switch (req.params.catalogId) {
            case "watchlist-movies":
              {
                movies = (
                  await fastify.library.db.orm.public.WatchList.where({
                    userId: req.user.id,
                  })
                    .where((a) => a.movie.every((b) => b.mediaType.eq("movie")))
                    .include("movie")
                    .orderBy((a) => a.createdat.desc())
                    .all()
                ).map((a) => a.movie);
              }
              break;
            case "watchlist-series":
              {
                movies = (
                  await fastify.library.db.orm.public.WatchList.where({
                    userId: req.user.id,
                  })
                    .where((a) => a.movie.every((b) => b.mediaType.eq("tv")))
                    .include("movie")
                    .orderBy((a) => a.createdat.desc())
                    .all()
                ).map((a) => a.movie);
              }

              break;
            case "top-movies-country":
              {
                // PASS: TODO here
              }
              break;
            default:
              break;
          }
        } else {
          const active = isCatalogEventActive(req.params.catalogId, new Date());
          if (active) {
            const isAward = awardsIds.includes(req.params.catalogId);
            if (!isAward) {
              movies = await fastify.library.db.orm.public.Movie.where({
                collection: req.params.catalogId,
              })
                .orderBy((a) => a.averagevote.desc())
                .all();
            } else {
              const startYear = dayjs().subtract(1, "year").startOf("year");
              const endYear = dayjs().endOf("year");
              movies = await fastify.library.db.orm.public.Movie.where({
                collection: req.params.catalogId,
              })
                .where((a) => a.release_date.gte(startYear.toDate()))
                .where((a) => a.release_date.lte(endYear.toDate()))
                .orderBy((a) => a.averagevote.desc())
                .all();
            }
          }
        }
        const metas = movies.map((a) => ({
          id: a.externalId,
          name: a.title,
          type: a.mediaType == "movie" ? "movie" : "series",
          description: a.description,
          poster: a.poster ?? "",
        }));
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
