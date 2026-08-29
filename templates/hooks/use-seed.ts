import { code, imp } from "ts-poet";

const useMutation = imp("useMutation@@tanstack/react-query")
const useQuery = imp("useQuery@@tanstack/react-query")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const apiGet = imp("apiGet@@/lib/query/api")
const apiMutate = imp("apiMutate@@/lib/query/api")
const queryKeys = imp("queryKeys@@/lib/query/keys")

export const writeUseSeedHook = () => code`
export function useSeedCounts() {
  return ${useQuery}({
    queryKey: ${queryKeys}.seed.counts,
    queryFn: () => ${apiGet}<{ counts: Record<string, number> }>("/api/seed"),
  });
}

export function useSeederConfig() {
  return ${useQuery}({
    queryKey: ${queryKeys}.seed.config,
    queryFn: () => ${apiGet}<Seeder.ConfigFile>("/api/seed/config"),
  });
}

export interface SeedResult {
  created: number;
  errors: string[];
}

export function useSeedModel() {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (payload: { modelName: string; count: number }) =>
      ${apiMutate}<SeedResult>("/api/seed", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${queryKeys}.seed.counts }),
  });
}
`.toString({ prefix: '"use client";' });

export default writeUseSeedHook;
