"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoardsPageBodySkeleton } from "@/components/routes/skeletons";
import { Widget } from "@/components/routes/boards/widget";
import { WidgetBuilder } from "@/components/routes/boards/widget-builder";

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function BoardPageContent({ slug }: { slug: string }) {
  const [pages, setPages] = useState<Boards.Page[] | null>(null);
  const [schema, setSchema] = useState<Schema.SchemaData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [builderWidget, setBuilderWidget] = useState<Boards.WidgetConfig | "new" | null>(null);

  const refreshPages = () => {
    fetch("/api/acaraje/boards/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages ?? []));
  };

  useEffect(() => {
    refreshPages();
    fetch("/api/acaraje/schemas")
      .then((r) => r.json())
      .then(setSchema);
  }, []);

  const page = pages?.find((p) => p.slug === slug) ?? null;
  const title = page?.name ?? humanizeSlug(slug);
  const widgets = page ? [...page.widgets].sort((a, b) => a.order - b.order) : [];

  const moveWidget = async (widgetId: string, direction: -1 | 1) => {
    if (!page) return;
    const ids = widgets.map((w) => w.id);
    const idx = ids.indexOf(widgetId);
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    await fetch(`/api/acaraje/boards/pages/${page.id}/widgets/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    refreshPages();
  };

  const deleteWidget = async (widgetId: string) => {
    if (!page) return;
    await fetch(`/api/acaraje/boards/pages/${page.id}/widgets/${widgetId}`, { method: "DELETE" });
    refreshPages();
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {page && (
          <Button variant="outline" size="sm" onClick={() => setEditMode((v) => !v)}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {editMode ? "Done editing" : "Edit layout"}
          </Button>
        )}
      </div>

      {pages === null ? (
        <BoardsPageBodySkeleton />
      ) : !page ? (
        <div className="text-center py-12 text-muted-foreground">Page not found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {widgets.map((widget, i) => (
            <div key={widget.id} className="relative group">
              <Widget config={widget} />
              {editMode && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-md border border-border/50 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" onClick={() => moveWidget(widget.id, -1)} disabled={i === 0} className="h-6 w-6">
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveWidget(widget.id, 1)}
                    disabled={i === widgets.length - 1}
                    className="h-6 w-6"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setBuilderWidget(widget)} className="h-6 w-6">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteWidget(widget.id)} className="h-6 w-6">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {editMode && (
            <button
              type="button"
              onClick={() => setBuilderWidget("new")}
              className="min-h-[10rem] rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Add widget</span>
            </button>
          )}

          {!editMode && widgets.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No widgets yet — click "Edit layout" to add one
            </div>
          )}
        </div>
      )}

      {builderWidget && page && schema && (
        <WidgetBuilder
          pageId={page.id}
          existing={builderWidget === "new" ? undefined : builderWidget}
          schema={schema}
          onClose={() => setBuilderWidget(null)}
          onSaved={() => {
            setBuilderWidget(null);
            refreshPages();
          }}
        />
      )}
    </div>
  );
}
