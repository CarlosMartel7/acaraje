"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CRUD_DELETE_ALL_SENTINEL } from "./delete-modal";

export default function AcarajeCalls_crud() {
  const params = useParams();
  const searchParams = useSearchParams();
  const model = params.model as string;

  const page = parseInt(searchParams.get("page") || "1");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [data, setData] = useState<Crud.PageData | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      } else {
        setColumns([]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [model, page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (deleteIds.length === 0) return;
    setDeleteLoading(true);
    try {
      if (deleteIds.length === 1 && deleteIds[0] === CRUD_DELETE_ALL_SENTINEL) {
        const res = await fetch(`/api/acaraje/crud/${model}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to delete all");
      } else if (deleteIds.length === 1) {
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

  return {
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
  };
}
