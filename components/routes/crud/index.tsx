"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Table2, Braces, Database, GitBranch } from "lucide-react";
import { acarajePath } from "@/lib/acaraje-routes";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CrudOverviewHeader, CrudOverviewBodySkeleton } from "@/components/routes/skeletons";
import AcarajeCalls_crudOverview from "./[[api-calls]]";

export function CrudOverviewContent() {
  const { models } = AcarajeCalls_crudOverview();
  const [search, setSearch] = useState("");

  const loading = models === null;
  const filteredModels = (models ?? []).filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6 animate-in">
      <CrudOverviewHeader />

      {loading ? (
        <CrudOverviewBodySkeleton />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="pl-9 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredModels.map((model) => (
              <Card key={model.name} className="p-4 space-y-3 border-border/50 bg-card/40 hover:border-border transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold font-mono truncate">{model.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-muted-foreground">
                    <Database className="w-3 h-3 text-muted-foreground/40" />
                    {model.recordCount.toLocaleString()} entries
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground/70">
                  <span>{model.fieldCount} fields</span>
                  {model.relationCount > 0 && <span>{model.relationCount} relations</span>}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={acarajePath(`/crud/${model.name}`)} className="flex items-center justify-center gap-1.5">
                      <Table2 className="w-3.5 h-3.5" />
                      View table
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link
                      href={`${acarajePath("/schemas")}?model=${model.name}`}
                      className="flex items-center justify-center gap-1.5"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      View schema
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}

            {filteredModels.length === 0 && (
              <div className="col-span-full flex items-center gap-2 px-4 py-12 justify-center text-muted-foreground text-sm">
                <Braces className="w-4 h-4" />
                No models match &quot;{search}&quot;
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
