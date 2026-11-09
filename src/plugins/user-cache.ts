import fp from "fastify-plugin";
import { LRUCache } from "lru-cache";
import type { Models } from "../prisma/contract.d";
import { db } from "../prisma/db.js";

const USER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const USER_CACHE_MAX_ITEMS = 1000;

// Scalar fields only. Relations such as watchHistory are intentionally left out.
export const userDetailFields = [
  "id",
  "email",
  "password",
  "country",
  "bio",
  "emailVerified",
  "createdat",
  "updatedat",
] as const;

/**
 * Bare user details (no relations). Includes the password hash, so do not
 * return this object to clients without removing it first.
 */
export type UserDetails = Pick<
  Models.public_User,
  (typeof userDetailFields)[number]
>;

export interface UserCache {
  getById(id: string): Promise<UserDetails | null>;
  invalidate(id: string): void;
}

export default fp(async (fastify) => {
  const cache = new LRUCache<string, UserDetails>({
    max: USER_CACHE_MAX_ITEMS,
    ttl: USER_CACHE_TTL_MS,
  });

  fastify.decorate("userCache", {
    async getById(id: string): Promise<UserDetails | null> {
      const cached = cache.get(id);

      if (cached) {
        return cached;
      }

      const user = await db.orm.public.User.where({ id })
        .select(...userDetailFields)
        .first();

      if (!user) {
        return null;
      }

      cache.set(id, user);

      return user;
    },
    invalidate(id: string): void {
      cache.delete(id);
    },
  } satisfies UserCache);
});

declare module "fastify" {
  interface FastifyInstance {
    userCache: UserCache;
  }
  interface FastifyRequest {
    user: UserDetails;
  }
}
