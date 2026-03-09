"use client";

import { Suspense } from "react";
import { CrudListContent } from "@/components/routes/crud/crud-list-content";

export default function CrudListPage() {
  return (
    <Suspense>
      <CrudListContent />
    </Suspense>
  );
}
