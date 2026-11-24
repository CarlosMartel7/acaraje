import { code, imp } from "ts-poet";

const fetchRequestHandler = imp("fetchRequestHandler@@trpc/server/adapters/fetch")
const appRouter = imp("appRouter@@/server/trpc/root")
const createTRPCContext = imp("createTRPCContext@@/server/trpc/init")

// Written to app/api/trpc/[trpc]/route.ts — the single Next.js route every procedure goes through.
export const writeTrpcRouteHandler = () => code`
const handler = (req: Request) =>
  ${fetchRequestHandler}({
    endpoint: "/api/trpc",
    req,
    router: ${appRouter},
    createContext: ({ req, resHeaders }) => ${createTRPCContext}({ req, resHeaders }),
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(\`tRPC error on \${path}:\`, error);
    },
  });

export { handler as GET, handler as POST };
`;

export default writeTrpcRouteHandler;
