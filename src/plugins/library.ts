import "dotenv/config";
import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "@/prisma/contract.d";
import contractJson from "@/prisma/contract.json" with { type: "json" };
import type { NoCollectionClasses } from "@prisma/orm-postgres/orm-client";
import fp from "fastify-plugin";
import TMDBClient from "@/services/tmdb";
export const contract = contractFromJson<Contract>(contractJson);

interface Library {
  db: PostgresClient<Contract, NoCollectionClasses>;
  helpers: {
    parseMovieId: typeof parseMovieId;
    tmdb: TMDBClient;
  };
}

export default fp<Library>(async (fastify) => {
  const db = postgres({
    contract,
    url: process.env["DATABASE_URL"]!,
  });
  const tmdb = new TMDBClient(fastify);
  fastify.decorate("library", { db: db, helpers: { parseMovieId, tmdb } });
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
