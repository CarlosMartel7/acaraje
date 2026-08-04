"use client";

import { useEffect, useState } from "react";
import { DashboardStatCards } from "./stat-cards";
import { DashboardModelsSection } from "./models";
import { DashboardHeader, DashboardBodySkeleton } from "@/components/routes/skeletons";
import AcarajeCalls_dashboard from "./[[api-calls]]";

export function DashboardContent() {
  const { stats } = AcarajeCalls_dashboard();

  return (
    <div className="p-8 space-y-8 animate-in">
      <DashboardHeader />

      {!stats ? (
        <DashboardBodySkeleton />
      ) : (
        <>
          <DashboardStatCards stats={stats} />
          <DashboardModelsSection stats={stats} />
        </>
      )}
    </div>
  );
}
