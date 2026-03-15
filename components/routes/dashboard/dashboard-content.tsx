"use client";

import { useEffect, useState } from "react";
import { Database, GitBranch, Table2, Hash, Layers, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  totalModels: number;
  totalEnums: number;
  totalFields: number;
  totalRelations: number;
  totalIndexes: number;
  modelsWithMap: number;
  topFieldTypes: { type: string; count: number }[];
  relationTypeCount: {
    "one-to-one": number;
    "one-to-many": number;
    "many-to-one": number;
    "many-to-many": number;
  };
  modelsOverview: { name: string; fieldCount: number; relationCount: number; recordCount: number }[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
  sub?: string;
}) {
  const card = (
    <Card
      className={cn(
        "group relative p-5 backdrop-blur-sm transition-all duration-200",
        "hover:border-border hover:bg-card/80",
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          <p className={cn("text-3xl font-bold font-mono", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1 font-mono">{sub}</p>}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded border opacity-70",
            color.replace("text-", "border-").replace("text-", ""),
          )}
          style={{ borderColor: "currentColor", color: "inherit" }}
        >
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
      {href && (
        <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all group-hover:translate-x-1 duration-200" />
      )}
    </Card>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

export function DashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/acaraje/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  const maxFieldCount = stats ? Math.max(...stats.modelsOverview.map((m) => m.fieldCount)) : 1;
  const maxRecordCount = stats ? Math.max(...stats.modelsOverview.map((m) => m.recordCount), 1) : 1;

  return (
    <div className="p-8 space-y-8 animate-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2">
          <span className="text-primary-foreground">●</span>
          <span>CONNECTED · postgresql</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Schema Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time introspection of your{" "}
          <code className="font-mono text-primary-foreground text-xs bg-primary px-1.5 py-0.5 rounded">prisma/schema.prisma</code>
        </p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-card/40" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Models"
            value={stats.totalModels}
            icon={Table2}
            color="text-primary-foreground"
            href="/schemas?tab=models"
            sub={`${stats.modelsWithMap} with @map`}
          />
          <StatCard
            label="Relations"
            value={stats.totalRelations}
            icon={GitBranch}
            color="text-chart-5"
            href="/relations"
            sub={`across all models`}
          />
          <StatCard
            label="Fields"
            value={stats.totalFields}
            icon={Hash}
            color="text-chart-4"
            sub={`avg ${(stats.totalFields / stats.totalModels).toFixed(1)} per model`}
          />
          <StatCard
            label="Enums"
            value={stats.totalEnums}
            icon={Layers}
            color="text-chart-1"
            href="/schemas?tab=enums"
            sub={`${stats.totalIndexes} indexes`}
          />
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Models bar chart */}
          <Card className="p-6 backdrop-blur-sm">
            <Tabs defaultValue="fields" className="w-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-foreground" />
                  <h2 className="text-sm font-semibold">Models</h2>
                </div>
                <TabsList className="h-8">
                  <TabsTrigger value="fields" className="text-xs px-2.5 py-1">
                    Fields
                  </TabsTrigger>
                  <TabsTrigger value="records" className="text-xs px-2.5 py-1">
                    Records
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="fields" className="mt-0 space-y-2">
                {[...stats.modelsOverview]
                  .sort((a, b) => b.fieldCount - a.fieldCount)
                  .map((model) => {
                    const value = model.fieldCount;
                    const max = maxFieldCount;
                    return (
                      <div key={model.name} className="group">
                        <div className="flex items-center justify-between mb-0.5">
                          <Link
                            href={`/schemas?model=${model.name}`}
                            className="text-xs font-mono text-muted-foreground hover:text-primary-foreground transition-colors"
                          >
                            {model.name}
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground">
                            {value.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-foreground to-chart-5 transition-all duration-700"
                            style={{
                              width: `${(value / max) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </TabsContent>
              <TabsContent value="records" className="mt-0 space-y-2">
                {[...stats.modelsOverview]
                  .sort((a, b) => b.recordCount - a.recordCount)
                  .map((model) => {
                    const value = model.recordCount;
                    const max = maxRecordCount;
                    return (
                      <div key={model.name} className="group">
                        <div className="flex items-center justify-between mb-0.5">
                          <Link
                            href={`/schemas?model=${model.name}`}
                            className="text-xs font-mono text-muted-foreground hover:text-primary-foreground transition-colors"
                          >
                            {model.name}
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground">
                            {value.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-foreground to-chart-5 transition-all duration-700"
                            style={{
                              width: `${(value / max) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            {/* Relation types */}
            <Card className="p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-5">
                <GitBranch className="w-4 h-4 text-chart-5" />
                <h2 className="text-sm font-semibold">Relation Types</h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "One to Many",
                    key: "one-to-many" as const,
                    color: "bg-primary-foreground",
                  },
                  {
                    label: "Many to One",
                    key: "many-to-one" as const,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "One to One",
                    key: "one-to-one" as const,
                    color: "bg-violet-500",
                  },
                  {
                    label: "Many to Many",
                    key: "many-to-many" as const,
                    color: "bg-amber-400",
                  },
                ].map(({ label, key, color }) => {
                  const val = stats.relationTypeCount[key];
                  const total = stats.totalRelations || 1;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{val}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", color)}
                          style={{ width: `${(val / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Top field types */}
            <Card className="p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-chart-4" />
                <h2 className="text-sm font-semibold">Top Field Types</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.topFieldTypes.map(({ type, count }) => (
                  <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border/50 bg-secondary/50">
                    <span className="text-xs font-mono text-foreground">{type}</span>
                    <span className="text-xs font-mono text-muted-foreground">×{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
