import { code, imp } from "ts-poet";

const initTRPC = imp("initTRPC@@trpc/server")
const TRPCError = imp("TRPCError@@trpc/server")
const requireAuth = imp("requireAuth@@/lib/auth/require-auth")

// tRPC counterpart of the per-route requireAuth checks: middleware.ts already 401s any
// unauthenticated /api/* request (/api/trpc included), and protectedProcedure re-checks the
// session cookie per call so a procedure is never reachable without one.
//
// No transformer (superjson) on purpose — responses stay plain JSON exactly like the REST
// routes', so Dates arrive as ISO strings and every component renders them the same in both
// flavors. Add one here (and to lib/trpc/client.ts's links) if you'd rather get real Dates back.
export const writeTrpcInit = () => code`
export async function createTRPCContext(opts: { req: Request; resHeaders: Headers }) {
  return { req: opts.req, resHeaders: opts.resHeaders };
}

const t = ${initTRPC}.context<Awaited<ReturnType<typeof createTRPCContext>>>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ${requireAuth}().catch(() => null);
  if (!session) throw new ${TRPCError}({ code: "UNAUTHORIZED", message: "Unauthorized" });
  return next({ ctx: { ...ctx, session } });
});

/** Same "err.message or a fallback" convention every REST route uses for its { error } body.
 *  A TRPCError thrown on purpose (NOT_FOUND, BAD_REQUEST, ...) is passed through untouched. */
export function internalError(err: unknown, fallback: string): never {
  if (err instanceof ${TRPCError}) throw err;
  throw new ${TRPCError}({
    code: "INTERNAL_SERVER_ERROR",
    message: err instanceof Error && err.message ? err.message : fallback,
    cause: err,
  });
}
`;

export default writeTrpcInit;
