import { code, imp } from "ts-poet";

const useQuery = imp("useQuery@@tanstack/react-query")
const useTRPC = imp("useTRPC@@/lib/trpc/client")

// tRPC flavor of templates/query/hooks/use-schemas.ts — same exports, same return shapes.
export const writeTrpcUseSchemasHook = () => code`
export function useSchemas() {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.schemas.get.queryOptions());
}
`.toString({ prefix: '"use client";' });

export default writeTrpcUseSchemasHook;
