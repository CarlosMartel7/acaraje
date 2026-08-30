import { code, imp } from "ts-poet";

const useParams = imp("useParams@next/navigation")
const useSearchParams = imp("useSearchParams@next/navigation")
const useMemo = imp("useMemo@react")
const useState = imp("useState@react")
const useCrudDelete = imp("useCrudDelete@@/query/hooks/use-crud")
const useCrudList = imp("useCrudList@@/query/hooks/use-crud")

export const writeCrudListApiCalls = () => code`
export default function AcarajeCalls_crud() {
  const params = ${useParams}();
  const searchParams = ${useSearchParams}();
  const model = params.model as string;

  const page = parseInt(searchParams.get("page") || "1");
  const [search, setSearch] = ${useState}(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = ${useState}(search);
  const [deleteIds, setDeleteIds] = ${useState}<string[]>([]);
  const [selectedIds, setSelectedIds] = ${useState}<Set<string>>(new Set());

  const filtersParam = searchParams.get("filters") || "";
  const filters: Crud.FilterCondition[] = ${useMemo}(() => {
    if (!filtersParam) return [];
    try {
      const parsed = JSON.parse(filtersParam);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [filtersParam]);
  const sortField = searchParams.get("sortField") || "";
  const sortOrder: Crud.SortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const {
    data,
    error: listError,
    refetch,
  } = ${useCrudList}(model, { page, pageSize: 20, search: debouncedSearch, filters, sortField, sortOrder });
  const deleteMutation = ${useCrudDelete}(model);

  const columns = ${useMemo}(() => {
    if (!data?.records?.length) return [];
    return Object.keys(data.records[0])
      .filter((k) => k !== "passwordHash")
      .slice(0, 8);
  }, [data]);

  const handleDelete = async () => {
    if (deleteIds.length === 0) return;
    await deleteMutation.mutateAsync(deleteIds);
    setDeleteIds([]);
    setSelectedIds(new Set());
  };

  return {
    handleDelete,
    data: data ?? null,
    columns,
    deleteIds,
    selectedIds,
    deleteLoading: deleteMutation.isPending,
    error: listError ? (listError as Error).message : null,
    setSearch,
    setDebouncedSearch,
    setSelectedIds,
    setDeleteIds,
    search,
    debouncedSearch,
    model,
    page,
    fetchData: () => refetch(),
    filters,
    sortField,
    sortOrder,
  };
}
`.toString({ prefix: '"use client";' });

export default writeCrudListApiCalls;
