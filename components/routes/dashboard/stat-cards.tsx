"use client";

import Link from "next/link";
import { GitBranch, Table2, Hash, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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

export function DashboardStatCards({ stats }: { stats: Dashboard.DashboardStats }) {
  return (
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
  );
}
