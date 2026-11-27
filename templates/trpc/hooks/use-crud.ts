import { code, imp } from "ts-poet";

const useInfiniteQuery = imp("useInfiniteQuery@@tanstack/react-query")
const useMutation = imp("useMutation@@tanstack/react-query")
const useQuery = imp("useQuery@@tanstack/react-query")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const useTRPC = imp("useTRPC@@/lib/trpc/client")
const useTRPCClient = imp("useTRPCClient@@/lib/trpc/client")
const CRUD_DELETE_ALL_SENTINEL = imp("CRUD_DELETE_ALL_SENTINEL@@/components/routes/crud/[model]/delete-modal")

// tRPC flavor of templates/query/hooks/use-crud.ts — same exports, same return shapes.
export const writeTrpcUseCrudHook = () => code`
export interface CrudListParams {
  page: number;
  pageSize: number;
  search: string;
  filters?: Crud.FilterCondition[];
  sortField?: string;
  sortOrder?: Crud.SortOrder;
}

// tRPC infers responses as their JSON-serialized form, which mangles Record<string, any> rows.
// Pin the data to the same global Crud.* types the REST hooks use — the JSON on the wire is
// identical in both flavors.
const asPageData = (data: unknown) => data as Crud.PageData;
const asRecordRow = (data: unknown) => data as Crud.RecordRow;

/** Every crud.* query cached for one model — the tRPC counterpart of queryKeys.crud.all(model). */
function useCrudModelFilter(model: string) {
  const trpc = ${useTRPC}();
  return {
    ...trpc.crud.pathFilter(),
    predicate: (query: { queryKey: readonly unknown[] }) =>
      (query.queryKey[1] as { input?: { model?: string } } | undefined)?.input?.model === model,
  };
}

export function useCrudList(model: string, params: CrudListParams) {
  const trpc = ${useTRPC}();
  return ${useQuery}(
    trpc.crud.list.queryOptions(
      {
        model,
        ...params,
        filters: params.filters?.length ? params.filters : undefined,
        sortField: params.sortField || undefined,
        sortOrder: params.sortField ? (params.sortOrder ?? "desc") : undefined,
      },
      { enabled: !!model, select: asPageData },
    ),
  );
}

export function useCrudRecord(model: string, id: string) {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.crud.get.queryOptions({ model, id }, { enabled: !!model && !!id, select: asRecordRow }));
}

export function useCrudOptions(model: string, enabled = true) {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.crud.options.queryOptions({ model, search: "" }, { enabled: enabled && !!model }));
}

/** Paginated + searchable variant for the relation picker, which lets the user type a term
 *  (confirmed via a search button or Enter) and infinite-scroll through matching results. */
export function useCrudOptionsInfinite(model: string, search: string, enabled = true) {
  const trpc = ${useTRPC}();
  return ${useInfiniteQuery}(
    trpc.crud.options.infiniteQueryOptions(
      { model, search },
      {
        initialCursor: 1,
        getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
        enabled: enabled && !!model,
      },
    ),
  );
}

export function useCrudCreate(model: string) {
  const trpcClient = ${useTRPCClient}();
  const queryClient = ${useQueryClient}();
  const modelFilter = useCrudModelFilter(model);
  return ${useMutation}({
    mutationFn: (data: Record<string, unknown>) => trpcClient.crud.create.mutate({ model, data }),
    onSuccess: () => {
      queryClient.invalidateQueries(modelFilter);
    },
  });
}

export function useCrudUpdate(model: string, id: string) {
  const trpcClient = ${useTRPCClient}();
  const trpc = ${useTRPC}();
  const queryClient = ${useQueryClient}();
  const modelFilter = useCrudModelFilter(model);
  return ${useMutation}({
    mutationFn: (data: Record<string, unknown>) => trpcClient.crud.update.mutate({ model, id, data }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries(modelFilter);
      queryClient.setQueryData(trpc.crud.get.queryKey({ model, id }), updated);
    },
  });
}

export function useCrudDelete(model: string) {
  const trpcClient = ${useTRPCClient}();
  const queryClient = ${useQueryClient}();
  const modelFilter = useCrudModelFilter(model);
  return ${useMutation}({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1 && ids[0] === ${CRUD_DELETE_ALL_SENTINEL}) {
        return trpcClient.crud.deleteAll.mutate({ model });
      }
      if (ids.length === 1) {
        return trpcClient.crud.delete.mutate({ model, id: ids[0] });
      }
      return trpcClient.crud.deleteMany.mutate({ model, ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(modelFilter);
    },
  });
}
`.toString({ prefix: '"use client";' });

export default writeTrpcUseCrudHook;
