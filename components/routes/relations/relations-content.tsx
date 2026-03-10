"use client";

import { useEffect, useState } from "react";
import { GitBranch, ArrowRight, Filter, Network } from "lucide-react";
import { cn, getRelationTypeColor } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { RelationGraph } from "@/components/relation-graph";

interface Relation {
  from: string;
  fromField: string;
  to: string;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
}

const RELATION_LABELS = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-one": "N:1",
  "many-to-many": "N:M",
};

const RELATION_COLORS = {
  "one-to-one": "border-violet-500/40 bg-violet-500/5 text-violet-400",
  "one-to-many": "border-primary-foreground/40 bg-primary-foreground/5 text-primary-foreground",
  "many-to-one": "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
  "many-to-many": "border-amber-500/40 bg-amber-500/5 text-amber-400",
};

const RELATION_DOT = {
  "one-to-one": "bg-violet-400",
  "one-to-many": "bg-primary-foreground",
  "many-to-one": "bg-emerald-400",
  "many-to-many": "bg-amber-400",
};

export function RelationsContent() {
  const [data, setData] = useState<{ relations: Relation[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"graph" | "all" | Relation["type"]>("graph");
  const [search, setSearch] = useState("");
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/relations")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const allRelations = data?.relations || [];
  const getFiltered = (f: typeof filter) =>
    allRelations.filter((r) => {
      if (f !== "all" && f !== "graph" && r.type !== f) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q);
      }
      return true;
    });

  const connectedModels = hoveredModel
    ? new Set(
        allRelations
          .filter((r) => r.from === hoveredModel || r.to === hoveredModel)
          .flatMap((r) => [r.from, r.to])
      )
    : null;

  const filtered = getFiltered(filter);
  const groupByModel = (rels: Relation[]) =>
    rels.reduce<Record<string, Relation[]>>((acc, r) => {
      if (!acc[r.from]) acc[r.from] = [];
      acc[r.from].push(r);
      return acc;
    }, {});

  const typeCount = {
    "one-to-one": allRelations.filter((r) => r.type === "one-to-one").length,
    "one-to-many": allRelations.filter((r) => r.type === "one-to-many").length,
    "many-to-one": allRelations.filter((r) => r.type === "many-to-one").length,
    "many-to-many": allRelations.filter((r) => r.type === "many-to-many").length,
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Model relationships inferred from your Prisma schema
        </p>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by model name..."
            className="pl-9 text-xs font-mono h-8"
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {filtered.length} of {allRelations.length} relations
        </span>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 p-1 bg-transparent border-0">
          <TabsTrigger value="graph" className="rounded-full text-xs font-mono data-[state=active]:bg-secondary data-[state=active]:border-border">
            <Network className="w-3 h-3 mr-1.5" />
            Graph
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-full text-xs font-mono data-[state=active]:bg-secondary data-[state=active]:border-border">
            All
            <span className="bg-secondary/80 px-1.5 py-0.5 rounded ml-1">{allRelations.length}</span>
          </TabsTrigger>
          {(["one-to-many", "one-to-one", "many-to-one", "many-to-many"] as const).map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className={cn(
                "rounded-full text-xs font-mono",
                "data-[state=active]:border data-[state=active]:border-current",
                type === "one-to-one" && "data-[state=active]:border-violet-500/40 data-[state=active]:bg-violet-500/5 data-[state=active]:text-violet-400",
                type === "one-to-many" && "data-[state=active]:border-primary-foreground/40 data-[state=active]:bg-primary-foreground/5 data-[state=active]:text-primary-foreground",
                type === "many-to-one" && "data-[state=active]:border-emerald-500/40 data-[state=active]:bg-emerald-500/5 data-[state=active]:text-emerald-400",
                type === "many-to-many" && "data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/5 data-[state=active]:text-amber-400"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", RELATION_DOT[type])} />
              {RELATION_LABELS[type]} · {type.replace(/-/g, " ")}
              <span className="opacity-70 ml-1">{typeCount[type]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

      {(["graph", "all", "one-to-many", "one-to-one", "many-to-one", "many-to-many"] as const).map((tabValue) => {
        const groupedForTab = groupByModel(getFiltered(tabValue));
        const isGraph = tabValue === "graph";
        return (
          <TabsContent key={tabValue} value={tabValue} className="mt-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="h-28 animate-pulse bg-card/40" />
                ))}
              </div>
            ) : isGraph ? (
              <RelationGraph relations={filtered} />
            ) : Object.keys(groupedForTab).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <GitBranch className="w-10 h-10 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">No relations found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedForTab).map(([fromModel, rels]) => (
            <Card
              key={fromModel}
              className={cn(
                "overflow-hidden transition-all duration-200",
                connectedModels && !connectedModels.has(fromModel)
                  ? "opacity-30"
                  : "opacity-100"
              )}
            >
              <div
                className="flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-secondary/20"
                onMouseEnter={() => setHoveredModel(fromModel)}
                onMouseLeave={() => setHoveredModel(null)}
              >
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                <span className="text-sm font-bold font-mono text-primary-foreground">{fromModel}</span>
                <span className="text-xs font-mono text-muted-foreground/60">
                  {rels.length} relation{rels.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {rels.map((rel, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-accent/20 transition-colors group"
                    onMouseEnter={() => setHoveredModel(rel.to)}
                    onMouseLeave={() => setHoveredModel(null)}
                  >
                    <span className="text-sm font-mono text-muted-foreground w-32 truncate">
                      .{rel.fromField}
                    </span>
                    <span
                      className={cn(
                        "flex-shrink-0 inline-flex items-center justify-center w-8 h-5 text-[10px] font-bold font-mono rounded border",
                        RELATION_COLORS[rel.type]
                      )}
                    >
                      {RELATION_LABELS[rel.type]}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                    <span
                      className={cn(
                        "text-sm font-mono font-medium flex-1",
                        getRelationTypeColor(rel.type)
                      )}
                    >
                      {rel.to}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      {rel.type.replace(/-/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
              </div>
            )}
          </TabsContent>
        );
      })}
      </Tabs>
    </div>
  );
}
