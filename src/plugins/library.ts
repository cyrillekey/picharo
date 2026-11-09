import "dotenv/config";
import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "@/prisma/contract.d";
import contractJson from "@/prisma/contract.json" with { type: "json" };
import type { NoCollectionClasses } from "@prisma/orm-postgres/orm-client";
import fp from "fastify-plugin";
export const contract = contractFromJson<Contract>(contractJson);

interface Library {
  db: PostgresClient<Contract, NoCollectionClasses>;
}

export default fp<Library>(async (fastify) => {
  const db = postgres({
    contract,
    url: process.env["DATABASE_URL"]!,
  });
  fastify.decorate("library", { db: db });
});

declare module "fastify" {
  interface FastifyInstance {
    library: Library;
  }
}
