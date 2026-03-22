"use client";

import { useEffect, useState } from "react";
import { DashboardStatCards } from "./stat-cards";
import { DashboardModelsSection } from "./models";
import AcarajeCalls_dashboard from "./[[api-calls]]";

export function DashboardContent() {
  const { stats } = AcarajeCalls_dashboard();

  return (
    <div className="p-8 space-y-8 animate-in">
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

      {stats ? <DashboardStatCards stats={stats} /> : null}

      {stats ? <DashboardModelsSection stats={stats} /> : null}
    </div>
  );
}
