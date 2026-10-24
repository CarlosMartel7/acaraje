import { code, imp } from "ts-poet";

const useQuery = imp("useQuery@@tanstack/react-query")
const useTRPC = imp("useTRPC@@/lib/trpc/client")

// tRPC flavor of templates/query/hooks/use-relations.ts — same exports, same return shapes.
export const writeTrpcUseRelationsHook = () => code`
export function useRelations() {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.relations.list.queryOptions());
}
`.toString({ prefix: '"use client";' });

export default writeTrpcUseRelationsHook;
