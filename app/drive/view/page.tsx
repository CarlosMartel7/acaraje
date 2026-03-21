"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { FolderTree } from "@/components/routes/drive/folder-tree";
import type { FolderNode } from "@/components/routes/drive/folder-tree";
import { ChevronLeft } from "lucide-react";

type RawFolder = { id: string; name: string; parents?: string[]; webViewLink?: string };

function structureFolders(folders: RawFolder[]): FolderNode[] {
  const filtered = folders.filter((f) => f.parents?.[0] !== f.id);
  const byId = new Map<string, FolderNode>();
  for (const f of filtered) {
    byId.set(f.id, { id: f.id, name: f.name, children: [], webViewLink: f.webViewLink });
  }
  const roots: FolderNode[] = [];
  for (const f of filtered) {
    const node = byId.get(f.id)!;
    const parentId = f.parents?.[0];
    if (!parentId || !byId.has(parentId)) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId)!;
      (parent.children ??= []).push(node);
    }
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const node of byId.values()) {
    if (node.children?.length) node.children.sort((a, b) => a.name.localeCompare(b.name));
  }
  return roots;
}

function DriveViewInner() {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/acaraje/drive/folders")
      .then((r) => r.json())
      .then((data) => setFolders(structureFolders(data.folders ?? [])))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Link
          href="/drive"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Upload
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Folder Structure</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse the storage bucket folder hierarchy</p>
      </div>

      {loading && <div className="text-muted-foreground text-sm">Loading folders…</div>}

      {!loading && folders.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-muted-foreground text-sm">
          No folders yet. Create folders from the <Link href="/drive" className="text-foreground hover:underline">Drive</Link> page.
        </div>
      )}

      {!loading && folders.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card/30 p-4 max-w-xl">
          <FolderTree
            folders={folders}
            defaultExpanded={new Set(folders.map((f) => f.id))}
          />
        </div>
      )}
    </div>
  );
}

export default function DriveViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground text-sm">Loading…</div>}>
      <DriveViewInner />
    </Suspense>
  );
}
