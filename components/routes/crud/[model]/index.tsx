"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight, AlertCircle, Loader2, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import DeleteModal, { CRUD_DELETE_ALL_SENTINEL } from "./delete-modal";
import AcarajeCalls_crud from "./[[api-calls]]";

/** Same locale options as drive view (`folder-contents-table`). */
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
    if (!/^\d{4}-\d{2}-\d{2}/.test(t)) return null;
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
  } = AcarajeCalls_crud();

  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleSelectAll = (checked?: boolean) => {
    if (!data?.records.length) return;
    const allSelected = data.records.every((r) => selectedIds.has(r.id));
    const shouldSelect = checked ?? !allSelected;
    if (shouldSelect) {
      setSelectedIds(new Set(data.records.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const openDeleteModal = (idsToDelete: string[]) => {
    setDeleteIds(idsToDelete);
  };

  const goPage = (p: number) => {
    const sp = new URLSearchParams({ page: String(p), search: debouncedSearch });
    router.push(`/crud/${model}?${sp}`);
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      {deleteIds.length > 0 && (
        <DeleteModal
          ids={deleteIds}
          deleteAllTotal={deleteIds.length === 1 && deleteIds[0] === CRUD_DELETE_ALL_SENTINEL ? data?.total : undefined}
          onConfirm={handleDelete}
          onCancel={() => setDeleteIds([])}
          loading={deleteLoading}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
            <span>CRUD</span>
            <span>/</span>
            <span className="text-primary-foreground">{model}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{model}</h1>
          {data && <p className="text-muted-foreground text-sm mt-1">{data.total.toLocaleString()} total records</p>}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => openDeleteModal(Array.from(selectedIds))}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selectedIds.size} selected
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!data?.total}
            onClick={() => setDeleteIds([CRUD_DELETE_ALL_SENTINEL])}
            className="border-destructive/35 text-red-400 hover:bg-destructive/10 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete all
          </Button>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/crud/${model}/new`} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New {model}
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${model} records...`}
          className="pl-9 font-mono"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded border border-destructive/30 bg-destructive/5 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Card className="overflow-hidden border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={!data?.records.length ? false : data.records.every((r) => selectedIds.has(r.id)) ? true : "indeterminate"}
                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data === null ? null : data.records.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No records found
                  </td>
                </tr>
              ) : (
                data.records.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/20 hover:bg-accent/20 transition-colors group",
                      selectedIds.has(row.id) && "bg-primary/30",
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds((p) => new Set(p).add(row.id));
                          else
                            setSelectedIds((p) => {
                              const n = new Set(p);
                              n.delete(row.id);
                              return n;
                            });
                        }}
                      />
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={cn("px-4 py-3 font-mono text-xs", col === "id" ? "text-muted-foreground/60" : "text-foreground")}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="min-w-0 truncate whitespace-nowrap">{formatCell(row[col])}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            aria-label="Copy to clipboard"
                            title="Copy to clipboard"
                            onClick={(e) => {
                              e.stopPropagation();
                              const text = serializeForClipboard(row[col]);
                              void navigator.clipboard
                                .writeText(text)
                                .then(() => toast.success("Copied"))
                                .catch(() => toast.error("Could not copy"));
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/crud/${model}/${row.id}`}
                          className="p-1.5 rounded hover:bg-primary-foreground/10 text-muted-foreground hover:text-primary-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDeleteModal([row.id])}
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-secondary/10">
            <span className="text-xs font-mono text-muted-foreground">
              Page {data.page} of {data.pageCount} · {data.total} records
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => goPage(page - 1)} disabled={page <= 1} className="h-7 w-7">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {[...Array(Math.min(5, data.pageCount))].map((_, i) => {
                const p = i + 1;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={() => goPage(p)}
                    className={cn(
                      "h-7 w-7 text-xs font-mono",
                      p === page &&
                        "bg-primary-foreground/10 border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20",
                    )}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => goPage(page + 1)}
                disabled={page >= data.pageCount}
                className="h-7 w-7"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
