"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface RecordRow {
  id: string;
  [key: string]: any;
}

interface PageData {
  records: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function formatCell(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (val instanceof Object && val.constructor === Object) return JSON.stringify(val);
  const str = String(val);
  if (str.length > 40) return str.slice(0, 40) + "…";
  return str;
}

function DeleteModal({
  ids,
  onConfirm,
  onCancel,
  loading,
}: {
  ids: string[];
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const count = ids.length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              Delete {count === 1 ? "Record" : `${count} Records`}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {count === 1 ? ids[0].slice(0, 20) + "…" : `${count} records selected`}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          This action cannot be undone. The record{count > 1 ? "s will" : " will"} be permanently removed.
        </p>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete
          </Button>
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function CrudListContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const model = params.model as string;

  const page = parseInt(searchParams.get("page") || "1");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [data, setData] = useState<PageData | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        search: debouncedSearch,
      });
      const res = await fetch(`/api/acaraje/crud/${model}?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
      if (json.records?.length > 0) {
        const cols = Object.keys(json.records[0]).filter((k) => k !== "passwordHash");
        setColumns(cols.slice(0, 8));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [model, page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (deleteIds.length === 0) return;
    setDeleteLoading(true);
    try {
      if (deleteIds.length === 1) {
        await fetch(`/api/acaraje/crud/${model}/${deleteIds[0]}`, { method: "DELETE" });
      } else {
        await fetch(`/api/acaraje/crud/${model}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: deleteIds }),
        });
      }
      setDeleteIds([]);
      setSelectedIds(new Set());
      fetchData();
    } finally {
      setDeleteLoading(false);
    }
  };

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
          {data && (
            <p className="text-muted-foreground text-sm mt-1">
              {data.total.toLocaleString()} total records
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => openDeleteModal(Array.from(selectedIds))}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selectedIds.size} selected
            </Button>
          )}
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
                    checked={
                      !data?.records.length
                        ? false
                        : data.records.every((r) => selectedIds.has(r.id))
                          ? true
                          : "indeterminate"
                    }
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
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border/20">
                    {[...Array((columns.length || 4) + 2)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.records.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-4 py-12 text-center text-muted-foreground text-sm"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                data?.records.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/20 hover:bg-accent/20 transition-colors group",
                      selectedIds.has(row.id) && "bg-primary/30"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds((p) => new Set(p).add(row.id));
                          else setSelectedIds((p) => { const n = new Set(p); n.delete(row.id); return n; });
                        }}
                      />
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={cn(
                          "px-4 py-3 font-mono text-xs whitespace-nowrap",
                          col === "id" ? "text-muted-foreground/60" : "text-foreground"
                        )}
                      >
                        {formatCell(row[col])}
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
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                className="h-7 w-7"
              >
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
                    className={cn("h-7 w-7 text-xs font-mono", p === page && "bg-primary-foreground/10 border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20")}
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
