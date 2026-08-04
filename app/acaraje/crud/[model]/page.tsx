"use client";

import { Suspense } from "react";
import CrudListContent from "@/components/routes/crud/[model]/index";
import { CrudListSkeleton } from "@/components/routes/skeletons";

export default function CrudListPage() {
  return (
    <Suspense fallback={<CrudListSkeleton />}>
      <CrudListContent />
    </Suspense>
  );
}
