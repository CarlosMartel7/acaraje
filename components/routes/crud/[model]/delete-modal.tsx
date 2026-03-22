"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const CRUD_DELETE_ALL_SENTINEL = "__DELETE_ALL__";

export default function DeleteModal({
  ids,
  onConfirm,
  onCancel,
  loading,
  deleteAllTotal,
}: {
  ids: string[];
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  /** When deleting every row in the model (ids must be [`CRUD_DELETE_ALL_SENTINEL`]). */
  deleteAllTotal?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDeleteAll = ids.length === 1 && ids[0] === CRUD_DELETE_ALL_SENTINEL;
  const count = isDeleteAll ? (deleteAllTotal ?? 0) : ids.length;

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Card className="p-6 max-w-sm w-full mx-4 shadow-2xl bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isDeleteAll ? "Delete all records" : `Delete ${count === 1 ? "Record" : `${count} Records`}`}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {isDeleteAll
                ? `${count.toLocaleString()} rows in this table`
                : count === 1
                  ? ids[0].slice(0, 20) + "…"
                  : `${count} records selected`}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {isDeleteAll
            ? "This will remove every row for this model. This cannot be undone."
            : `This action cannot be undone. The record${count > 1 ? "s will" : " will"} be permanently removed.`}
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
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

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
