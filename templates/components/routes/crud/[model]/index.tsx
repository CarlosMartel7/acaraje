import { code, imp } from "ts-poet";

const useEffect = imp("useEffect@react")
const useMemo = imp("useMemo@react")
const useRouter = imp("useRouter@next/navigation")
const Link = imp("Link=next/link")
const Plus = imp("Plus@lucide-react")
const Search = imp("Search@lucide-react")
const Trash2 = imp("Trash2@lucide-react")
const Pencil = imp("Pencil@lucide-react")
const ChevronLeft = imp("ChevronLeft@lucide-react")
const ChevronRight = imp("ChevronRight@lucide-react")
const AlertCircle = imp("AlertCircle@lucide-react")
const Loader2 = imp("Loader2@lucide-react")
const RefreshCw = imp("RefreshCw@lucide-react")
const Copy = imp("Copy@lucide-react")
const toast = imp("toast@sonner")
const ColumnDef = imp("t:ColumnDef@@tanstack/react-table")
const RowSelectionState = imp("t:RowSelectionState@@tanstack/react-table")
const flexRender = imp("flexRender@@tanstack/react-table")
const rowSelectionFeature = imp("rowSelectionFeature@@tanstack/react-table")
const tableFeatures = imp("tableFeatures@@tanstack/react-table")
const useTable = imp("useTable@@tanstack/react-table")
const cn = imp("cn@@/lib/utils")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const Button = imp("Button@@/components/ui/button")
const Checkbox = imp("Checkbox@@/components/ui/checkbox")
const Input = imp("Input@@/components/ui/input")
const Card = imp("Card@@/components/ui/card")
const Skeleton = imp("Skeleton@@/components/ui/skeleton")
const Table = imp("Table@@/components/ui/table")
const TableBody = imp("TableBody@@/components/ui/table")
const TableCell = imp("TableCell@@/components/ui/table")
const TableHead = imp("TableHead@@/components/ui/table")
const TableHeader = imp("TableHeader@@/components/ui/table")
const TableRow = imp("TableRow@@/components/ui/table")
const CrudListBodySkeleton = imp("CrudListBodySkeleton@@/components/routes/skeletons")
const DeleteModal = imp("DeleteModal=./delete-modal")
const CRUD_DELETE_ALL_SENTINEL = imp("CRUD_DELETE_ALL_SENTINEL@./delete-modal")
const FilterBar = imp("FilterBar@./filter-bar")
const AcarajeCalls_crud = imp("AcarajeCalls_crud=./[[api-calls]]")

export const writeCrudListContent = () => code`
/** Same locale options as drive view (\`folder-contents-table\`). */
function formatDateLike(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function tryFormatAsDate(val: unknown): string | null {
  if (val instanceof Date && !isNaN(val.getTime())) return formatDateLike(val);
  if (typeof val === "string") {
    const t = val.trim();
    if (!/^\\d{4}-\\d{2}-\\d{2}/.test(t)) return null;
    const parsed = new Date(t);
    if (!isNaN(parsed.getTime())) return formatDateLike(parsed);
  }
  return null;
}

function formatCell(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  const asDate = tryFormatAsDate(val);
  if (asDate !== null) return asDate;
  if (val instanceof Object && val.constructor === Object) return JSON.stringify(val);
  const str = String(val);
  if (str.length > 40) return str.slice(0, 40) + "…";
  return str;
}

function serializeForClipboard(val: any): string {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/** Only row selection is needed — sort/filter/pagination stay server-driven via URL params, so no
 *  row-model feature slots are registered. Kept at module scope: features must be stable. */
const tableFeatureSet = ${tableFeatures}({ ${rowSelectionFeature} });
const EMPTY_ROWS: Crud.RecordRow[] = [];

export default function CrudListContent() {
  const {
    handleDelete,
    data,
    columns,
    deleteIds,
    selectedIds,
    deleteLoading,
    error,
    setSearch,
    setDebouncedSearch,
    setSelectedIds,
    setDeleteIds,
    search,
    debouncedSearch,
    model,
    page,
    fetchData,
    filters,
    sortField,
    sortOrder,
  } = ${AcarajeCalls_crud}();

  const router = ${useRouter}();

  ${useEffect}(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openDeleteModal = (idsToDelete: string[]) => {
    setDeleteIds(idsToDelete);
  };

  const buildAndPush = (overrides: { page?: number; filters?: Crud.FilterCondition[]; sortField?: string; sortOrder?: Crud.SortOrder }) => {
    const nextFilters = overrides.filters ?? filters;
    const nextSortField = overrides.sortField ?? sortField;
    const nextSortOrder = overrides.sortOrder ?? sortOrder;
    const sp = new URLSearchParams({ page: String(overrides.page ?? page), search: debouncedSearch });
    if (nextFilters.length > 0) sp.set("filters", JSON.stringify(nextFilters));
    if (nextSortField) {
      sp.set("sortField", nextSortField);
      sp.set("sortOrder", nextSortOrder);
    }
    router.push(\`\${${acarajePath}(\`/crud/\${model}\`)}?\${sp}\`);
  };

  const goPage = (p: number) => buildAndPush({ page: p });
  const handleFiltersChange = (next: Crud.FilterCondition[]) => buildAndPush({ filters: next, page: 1 });
  const handleSortChange = (field: string, order: Crud.SortOrder) => buildAndPush({ sortField: field, sortOrder: order, page: 1 });

  const loading = data === null && !error;

  // Table presentation + selection only — sort/filter/pagination stay server-driven via URL params.
  const rowSelection = ${useMemo}<${RowSelectionState}>(() => {
    const map: ${RowSelectionState} = {};
    for (const id of selectedIds) map[id] = true;
    return map;
  }, [selectedIds]);

  const tableColumns = ${useMemo}<${ColumnDef}<typeof tableFeatureSet, Crud.RecordRow, any>[]>(() => {
    const selectColumn: ${ColumnDef}<typeof tableFeatureSet, Crud.RecordRow, any> = {
      id: "select",
      header: ({ table }) => (
        <${Checkbox}
          checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
        />
      ),
      cell: ({ row }) => <${Checkbox} checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(checked === true)} />,
    };

    const dataColumns: ${ColumnDef}<typeof tableFeatureSet, Crud.RecordRow, any>[] = columns.map((col) => ({
      id: col,
      accessorFn: (row) => row[col],
      header: col,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={${cn}("min-w-0 truncate whitespace-nowrap", col === "id" ? "text-muted-foreground/60" : "text-foreground")}>
            {formatCell(row.original[col])}
          </span>
          <${Button}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            aria-label="Copy to clipboard"
            title="Copy to clipboard"
            onClick={(e) => {
              e.stopPropagation();
              const text = serializeForClipboard(row.original[col]);
              void navigator.clipboard
                .writeText(text)
                .then(() => ${toast}.success("Copied"))
                .catch(() => ${toast}.error("Could not copy"));
            }}
          >
            <${Copy} className="w-3 h-3" />
          </${Button}>
        </div>
      ),
    }));

    const actionsColumn: ${ColumnDef}<typeof tableFeatureSet, Crud.RecordRow, any> = {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <${Link}
            href={${acarajePath}(\`/crud/\${model}/\${row.original.id}\`)}
            className="p-1.5 rounded hover:bg-primary-foreground/10 text-muted-foreground hover:text-primary-foreground transition-colors"
          >
            <${Pencil} className="w-3.5 h-3.5" />
          </${Link}>
          <${Button}
            variant="ghost"
            size="icon-sm"
            onClick={() => openDeleteModal([row.original.id])}
            className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-destructive/10"
          >
            <${Trash2} className="w-3.5 h-3.5" />
          </${Button}>
        </div>
      ),
    };

    return [selectColumn, ...dataColumns, actionsColumn];
  }, [columns, model]);

  const table = ${useTable}({
    features: tableFeatureSet,
    data: data?.records ?? EMPTY_ROWS,
    columns: tableColumns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setSelectedIds(new Set(Object.keys(next)));
    },
    getRowId: (row) => row.id,
  });

  return (
    <div className="p-8 space-y-6 animate-in">
      {deleteIds.length > 0 && (
        <${DeleteModal}
          ids={deleteIds}
          deleteAllTotal={deleteIds.length === 1 && deleteIds[0] === ${CRUD_DELETE_ALL_SENTINEL} ? data?.total : undefined}
          onConfirm={handleDelete}
          onCancel={() => setDeleteIds([])}
          loading={deleteLoading}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <span>CRUD</span>
            <span>/</span>
            <span className="text-primary-foreground">{model}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{model}</h1>
          {data && <p className="text-muted-foreground text-sm mt-1">{data.total.toLocaleString()} total records</p>}
        </div>
        {loading ? (
          <div className="flex gap-2">
            <${Skeleton} className="h-9 w-9" />
            <${Skeleton} className="h-9 w-28" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <${Button} variant="destructive" onClick={() => openDeleteModal(Array.from(selectedIds))}>
                <${Trash2} className="w-3.5 h-3.5" />
                Delete {selectedIds.size} selected
              </${Button}>
            )}
            <${Button}
              variant="outline"
              disabled={!data?.total}
              onClick={() => setDeleteIds([${CRUD_DELETE_ALL_SENTINEL}])}
              className="border-destructive/35 text-red-400 hover:bg-destructive/10 hover:text-red-300"
            >
              <${Trash2} className="w-3.5 h-3.5" />
              Delete all
            </${Button}>
            <${Button} variant="outline" size="icon" onClick={fetchData}>
              <${RefreshCw} className="w-4 h-4" />
            </${Button}>
            <${Button} variant="outline" asChild>
              <${Link} href={${acarajePath}(\`/crud/\${model}/new\`)} className="flex items-center gap-2">
                <${Plus} className="w-4 h-4" />
                New {model}
              </${Link}>
            </${Button}>
          </div>
        )}
      </div>

      {loading ? (
        <${CrudListBodySkeleton} />
      ) : (
        <>
          <div className="relative max-w-sm">
            <${Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <${Input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={\`Search \${model} records...\`}
              className="pl-9 font-mono"
            />
          </div>

          <${FilterBar}
            model={model}
            filters={filters}
            sortField={sortField}
            sortOrder={sortOrder}
            onFiltersChange={handleFiltersChange}
            onSortChange={handleSortChange}
          />

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded border border-destructive/30 bg-destructive/5 text-red-400 text-sm">
              <${AlertCircle} className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <${Card} className="overflow-hidden border-border/50">
            <div className="overflow-x-auto">
              <${Table}>
                <${TableHeader}>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <${TableRow} key={headerGroup.id} className="border-b border-border/50 bg-secondary/20 hover:bg-secondary/20">
                      {headerGroup.headers.map((header) => (
                        <${TableHead}
                          key={header.id}
                          className={${cn}(
                            "h-auto px-4 py-3 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider",
                            header.id === "select" && "w-10",
                          )}
                        >
                          {header.isPlaceholder ? null : ${flexRender}(header.column.columnDef.header, header.getContext())}
                        </${TableHead}>
                      ))}
                    </${TableRow}>
                  ))}
                </${TableHeader}>
                <${TableBody}>
                  {data === null ? null : table.getRowModel().rows.length === 0 ? (
                    <${TableRow}>
                      <${TableCell} colSpan={columns.length + 2} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No records found
                      </${TableCell}>
                    </${TableRow}>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <${TableRow}
                        key={row.id}
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        className={${cn}(
                          "border-b border-border/20 hover:bg-accent/20 transition-colors group",
                          row.getIsSelected() && "bg-primary/30",
                        )}
                      >
                        {row.getAllCells().map((cell) => (
                          <${TableCell} key={cell.id} className="px-4 py-3 font-mono text-xs">
                            {${flexRender}(cell.column.columnDef.cell, cell.getContext())}
                          </${TableCell}>
                        ))}
                      </${TableRow}>
                    ))
                  )}
                </${TableBody}>
              </${Table}>
            </div>

            {data && data.pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-secondary/10">
                <span className="text-xs font-mono text-muted-foreground">
                  Page {data.page} of {data.pageCount} · {data.total} records
                </span>
                <div className="flex items-center gap-1">
                  <${Button} variant="outline" size="icon-sm" onClick={() => goPage(page - 1)} disabled={page <= 1} className="h-7 w-7">
                    <${ChevronLeft} className="w-3.5 h-3.5" />
                  </${Button}>
                  {[...Array(Math.min(5, data.pageCount))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <${Button}
                        key={p}
                        variant={p === page ? "default" : "ghost"}
                        size="icon-sm"
                        onClick={() => goPage(p)}
                        className={${cn}(
                          "h-7 w-7 text-xs font-mono",
                          p === page &&
                          "bg-primary-foreground/10 border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20",
                        )}
                      >
                        {p}
                      </${Button}>
                    );
                  })}
                  <${Button}
                    variant="outline"
                    size="icon-sm"
                    onClick={() => goPage(page + 1)}
                    disabled={page >= data.pageCount}
                    className="h-7 w-7"
                  >
                    <${ChevronRight} className="w-3.5 h-3.5" />
                  </${Button}>
                </div>
              </div>
            )}
          </${Card}>
        </>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeCrudListContent;
