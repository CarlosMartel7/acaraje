import { code, imp } from "ts-poet";

const useInfiniteQuery = imp("useInfiniteQuery@@tanstack/react-query")
const useMutation = imp("useMutation@@tanstack/react-query")
const useQuery = imp("useQuery@@tanstack/react-query")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const apiGet = imp("apiGet@@/lib/query/api")
const apiMutate = imp("apiMutate@@/lib/query/api")
const queryKeys = imp("queryKeys@@/lib/query/keys")
const CRUD_DELETE_ALL_SENTINEL = imp("CRUD_DELETE_ALL_SENTINEL@@/components/routes/crud/[model]/delete-modal")

export const writeUseCrudHook = () => code`
export interface CrudListParams {
  page: number;
  pageSize: number;
  search: string;
  filters?: Crud.FilterCondition[];
  sortField?: string;
  sortOrder?: Crud.SortOrder;
}

function crudListUrl(model: string, params: CrudListParams): string {
  const filtersParam = params.filters?.length ? JSON.stringify(params.filters) : "";
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.search,
  });
  if (filtersParam) qs.set("filters", filtersParam);
  if (params.sortField) {
    qs.set("sortField", params.sortField);
    qs.set("sortOrder", params.sortOrder ?? "desc");
  }
  return \`/api/crud/\${model}?\${qs}\`;
}

export function useCrudList(model: string, params: CrudListParams) {
  const filtersParam = params.filters?.length ? JSON.stringify(params.filters) : "";
  return ${useQuery}({
    queryKey: ${queryKeys}.crud.list(model, { ...params, filters: filtersParam }),
    queryFn: () => ${apiGet}<Crud.PageData>(crudListUrl(model, params)),
    enabled: !!model,
  });
}

export function useCrudRecord(model: string, id: string) {
  return ${useQuery}({
    queryKey: ${queryKeys}.crud.detail(model, id),
    queryFn: () => ${apiGet}<Crud.RecordRow>(\`/api/crud/\${model}/\${id}\`),
    enabled: !!model && !!id,
  });
}

function crudOptionsUrl(model: string, page: number, search: string): string {
  const qs = new URLSearchParams({ page: String(page) });
  if (search) qs.set("search", search);
  return \`/api/crud/\${model}/options?\${qs}\`;
}

export function useCrudOptions(model: string, enabled = true) {
  return ${useQuery}({
    queryKey: ${queryKeys}.crud.options(model),
    queryFn: () => ${apiGet}<Crud.OptionsPage>(crudOptionsUrl(model, 1, "")),
    enabled: enabled && !!model,
  });
}

/** Paginated + searchable variant for the relation picker, which lets the user type a term
 *  (confirmed via a search button or Enter) and infinite-scroll through matching results. */
export function useCrudOptionsInfinite(model: string, search: string, enabled = true) {
  return ${useInfiniteQuery}({
    queryKey: ${queryKeys}.crud.options(model, search),
    queryFn: ({ pageParam }) => ${apiGet}<Crud.OptionsPage>(crudOptionsUrl(model, pageParam, search)),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
    enabled: enabled && !!model,
  });
}

export function useCrudCreate(model: string) {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (data: Record<string, unknown>) => ${apiMutate}<Crud.RecordRow>(\`/api/crud/\${model}\`, { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${queryKeys}.crud.all(model) });
    },
  });
}

export function useCrudUpdate(model: string, id: string) {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (data: Record<string, unknown>) =>
      ${apiMutate}<Crud.RecordRow>(\`/api/crud/\${model}/\${id}\`, { method: "PUT", body: data }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ${queryKeys}.crud.all(model) });
      queryClient.setQueryData(${queryKeys}.crud.detail(model, id), updated);
    },
  });
}

export function useCrudDelete(model: string) {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1 && ids[0] === ${CRUD_DELETE_ALL_SENTINEL}) {
        return ${apiMutate}(\`/api/crud/\${model}\`, { method: "DELETE", body: { all: true } });
      }
      if (ids.length === 1) {
        return ${apiMutate}(\`/api/crud/\${model}/\${ids[0]}\`, { method: "DELETE" });
      }
      return ${apiMutate}(\`/api/crud/\${model}\`, { method: "DELETE", body: { ids } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${queryKeys}.crud.all(model) });
    },
  });
}
`.toString({ prefix: '"use client";' });

export default writeUseCrudHook;
