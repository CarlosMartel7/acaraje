"use client";

import { Suspense } from "react";
import { CrudOverviewContent } from "@/components/routes/crud/index";
import { CrudOverviewSkeleton } from "@/components/routes/skeletons";

export default function CrudOverviewPage() {
  return (
    <Suspense fallback={<CrudOverviewSkeleton />}>
      <CrudOverviewContent />
    </Suspense>
  );
}
