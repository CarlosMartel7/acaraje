"use client";

import { ChevronRight } from "lucide-react";

export type FolderBreadcrumbItem = { id: string; name: string };

/** Builds cumulative path segments from a storage prefix (e.g. `a/b/` → crumbs for `a/`, `a/b/`). */
export function parseFolderBreadcrumb(prefix: string): FolderBreadcrumbItem[] {
  if (!prefix) return [];
  const parts = prefix.replace(/\/$/, "").split("/").filter(Boolean);
  const crumbs: FolderBreadcrumbItem[] = [];
  let acc = "";
  for (const p of parts) {
    acc += `${p}/`;
    crumbs.push({ id: acc, name: p });
  }
  return crumbs;
}

type DriveFolderBreadcrumbsProps = {
  rootPrefix: string;
  breadcrumbs: FolderBreadcrumbItem[];
  onNavigate: (prefix: string) => void;
};

export function DriveFolderBreadcrumbs({
  rootPrefix,
  breadcrumbs,
  onNavigate,
}: DriveFolderBreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onNavigate(rootPrefix)}
        className="text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        Root
      </button>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.id} className="flex items-center gap-2">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
          <button
            type="button"
            onClick={() => onNavigate(crumb.id)}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </div>
  );
}
