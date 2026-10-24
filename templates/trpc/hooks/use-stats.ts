import { code, imp } from "ts-poet";

const useQuery = imp("useQuery@@tanstack/react-query")
const useTRPC = imp("useTRPC@@/lib/trpc/client")

// tRPC flavor of templates/query/hooks/use-stats.ts — same exports, same return shapes.
export const writeTrpcUseStatsHook = () => code`
export function useStats() {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.stats.get.queryOptions());
}
`.toString({ prefix: '"use client";' });

export default writeTrpcUseStatsHook;
