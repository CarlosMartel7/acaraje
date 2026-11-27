import { code, imp } from "ts-poet";

const useCallback = imp("useCallback@react")
const useMutation = imp("useMutation@@tanstack/react-query")
const useQuery = imp("useQuery@@tanstack/react-query")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const useTRPC = imp("useTRPC@@/lib/trpc/client")

// tRPC flavor of templates/query/hooks/use-seed.ts — same exports, same return shapes.
export const writeTrpcUseSeedHook = () => code`
export function useSeedCounts() {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.seed.counts.queryOptions());
}

export function useSeederConfig() {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.seed.config.queryOptions());
}

export interface SeedResult {
  created: number;
  errors: string[];
}

export function useSeedModel() {
  const trpc = ${useTRPC}();
  const queryClient = ${useQueryClient}();
  return ${useMutation}(
    trpc.seed.run.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.seed.counts.queryFilter()),
    }),
  );
}

/** Writes a freshly saved config straight into the useSeederConfig() cache. */
export function useSetSeederConfigCache() {
  const trpc = ${useTRPC}();
  const queryClient = ${useQueryClient}();
  return ${useCallback}(
    (config: Seeder.ConfigFile) => {
      queryClient.setQueryData(trpc.seed.config.queryKey(), config);
    },
    [queryClient, trpc],
  );
}

export function useSaveSeederConfig() {
  const trpc = ${useTRPC}();
  return ${useMutation}(trpc.seed.saveConfig.mutationOptions());
}
`.toString({ prefix: '"use client";' });

export default writeTrpcUseSeedHook;
