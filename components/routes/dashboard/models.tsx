"use client";

import Link from "next/link";
import { Database, GitBranch, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export function DashboardModelsSection({ stats }: { stats: Dashboard.DashboardStats }) {
  const maxFieldCount = stats.modelsOverview.length > 0 ? Math.max(...stats.modelsOverview.map((m) => m.fieldCount)) : 1;
  const maxRecordCount = stats.modelsOverview.length > 0 ? Math.max(...stats.modelsOverview.map((m) => m.recordCount), 1) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <span className="text-xs font-mono text-muted-foreground">{value.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-foreground to-chart-5 transition-all duration-700"
                        style={{ width: `${(value / max) * 100}%` }}
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
                      <span className="text-xs font-mono text-muted-foreground">{value.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-foreground to-chart-5 transition-all duration-700"
                        style={{ width: `${(value / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </TabsContent>
        </Tabs>
      </Card>

      <div className="space-y-6">
        <Card className="p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <GitBranch className="w-4 h-4 text-chart-5" />
            <h2 className="text-sm font-semibold">Relation Types</h2>
          </div>
          <div className="space-y-3">
            {(
              [
                { label: "One to Many", key: "one-to-many" as const, color: "bg-primary-foreground" },
                { label: "Many to One", key: "many-to-one" as const, color: "bg-emerald-500" },
                { label: "One to One", key: "one-to-one" as const, color: "bg-violet-500" },
                { label: "Many to Many", key: "many-to-many" as const, color: "bg-amber-400" },
              ] as const
            ).map(({ label, key, color }) => {
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
  );
}
