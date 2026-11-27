import { code, imp } from "ts-poet";

const createTRPCContext = imp("createTRPCContext@@trpc/tanstack-react-query")
const createTRPCClient = imp("createTRPCClient@@trpc/client")
const httpBatchLink = imp("httpBatchLink@@trpc/client")
const httpLink = imp("httpLink@@trpc/client")
const isNonJsonSerializable = imp("isNonJsonSerializable@@trpc/client")
const splitLink = imp("splitLink@@trpc/client")
const AppRouter = imp("t:AppRouter@@/server/trpc/root")

export const writeTrpcClient = () => code`
export const { TRPCProvider, useTRPC, useTRPCClient } = ${createTRPCContext}<${AppRouter}>();

const TRPC_URL = "/api/trpc";

/** FormData (drive uploads) can't be batched into one JSON request, so it goes through a plain
 *  httpLink; everything else is batched. */
export function makeTRPCClient() {
  return ${createTRPCClient}<${AppRouter}>({
    links: [
      ${splitLink}({
        condition: (op) => ${isNonJsonSerializable}(op.input),
        true: ${httpLink}({ url: TRPC_URL }),
        false: ${httpBatchLink}({ url: TRPC_URL }),
      }),
    ],
  });
}
`.toString({ prefix: '"use client";' });

export default writeTrpcClient;
