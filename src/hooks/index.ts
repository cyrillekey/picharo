import type {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";

export async function isRequestValidated(
  req: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) {
  try {
    const id: string = (req.params as Record<string, string>)?.id;
    if (!id) {
      done();
      return reply.redirect("/configure");
    }
    const user = await req.server.userCache.getById(id);
    if (!user) {
      done();
      return reply.redirect("/configure");
    }
    req.user = user;
    done();
  } catch (error) {
    req.log.error(error);
    return reply.redirect("/configure");
  }
}
