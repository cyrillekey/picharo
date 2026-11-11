import "dotenv/config";
import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "@/prisma/contract.d";
import contractJson from "@/prisma/contract.json" with { type: "json" };
import type { NoCollectionClasses } from "@prisma/orm-postgres/orm-client";
import fp from "fastify-plugin";
import TMDBClient from "@/services/tmdb";
import { getCatalogEventsForDate } from "@/utils/holiday";
export const contract = contractFromJson<Contract>(contractJson);

interface Library {
  db: PostgresClient<Contract, NoCollectionClasses>;
  helpers: {
    parseMovieId: typeof parseMovieId;
    validateVideoId: typeof validateVideoId;
    catalogBuilder: typeof catalogBuilder;
    tmdb: TMDBClient;
  };
}

export default fp<Library>(async (fastify) => {
  const db = postgres({
    contract,
    url: process.env["DATABASE_URL"]!,
  });
  const tmdb = new TMDBClient(fastify);
  fastify.decorate("library", {
    db: db,
    helpers: { parseMovieId, tmdb, validateVideoId, catalogBuilder },
  });
});

declare module "fastify" {
  interface FastifyInstance {
    library: Library;
  }
}

const parseMovieId = (
  id: string,
):
  | {
      movieId: string;
      episode?: number;
      season?: number;
      type: "tv" | "movie";
    }
  | false => {
  const isValid = RegExp(/^tt/).test(id);
  if (isValid) {
    const isTv = id.match(/:/gi);
    if (isTv) {
      const parts = id.split(":");
      return {
        type: "tv",
        movieId: parts[0],
        season: Number(parts[1]),
        episode: Number(parts[2]),
      };
    } else {
      return {
        type: "movie",
        movieId: id,
      };
    }
  } else {
    return false;
  }
};

const validateVideoId = (id: string): boolean => {
  try {
    return !!id.match(/^tt/);
  } catch {
    return false;
  }
};

const catalogBuilder = ({ country }: { country: string }) => {
  const catalogs = [
    {
      id: "top-movies-country",
      name: `Top 10 movies in ${country}`,
      type: "movie",
    },
    { id: "top-tv-country", name: `Top 10 tv in ${country}`, type: "series" },
    { id: "recommendation-movie", name: "Recommended Movies", type: "movie" },
    { id: "recommendation-tv", name: "Recommended Series", type: "series" },
    {
      id: "watchlist-movies",
      name: "Watchlist Movies",
      type: "movie",
    },
  ];
  const dateCatalogs = getCatalogEventsForDate(new Date());
  const formated = dateCatalogs.map((a) => ({
    id: a.id,
    name: a.title,
    type: "movie",
  }));
  return catalogs.concat(formated);
};
