import { code, imp } from "ts-poet";

const useQuery = imp("useQuery@@tanstack/react-query")
const apiGet = imp("apiGet@@/lib/query/api")
const queryKeys = imp("queryKeys@@/lib/query/keys")

export const writeUseStatsHook = () => code`
export function useStats() {
  return ${useQuery}({
    queryKey: ${queryKeys}.stats,
    queryFn: () => ${apiGet}<Dashboard.DashboardStats>("/api/acaraje/stats"),
  });
}
`.toString({ prefix: '"use client";' });

export default writeUseStatsHook;
