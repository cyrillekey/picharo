import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

export async function isRequestValidated(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const id: string = (req.params as Record<string, string>)?.id;
    if (!id) {
      return reply.redirect("/configure");
    }
    const user = await req.server.userCache.getById(id);
    if (!user) {
      return reply.redirect("/configure");
    }
    req.user = user;
    return true;
  } catch (error) {
    req.log.error(error);
    return reply.redirect("/configure");
  }
}
