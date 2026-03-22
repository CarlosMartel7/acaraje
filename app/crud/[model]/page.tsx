"use client";

import { Suspense } from "react";
import CrudListContent from "@/components/routes/crud/[model]/index";

export default function CrudListPage() {
  return (
    <Suspense fallback={null}>
      <CrudListContent />
    </Suspense>
  );
}
