"use client";

import { Suspense } from "react";
import { SchemasContent } from "@/components/routes/schemas";
import { SchemasSkeleton } from "@/components/routes/skeletons";

export default function SchemasPage() {
  return (
    <Suspense fallback={<SchemasSkeleton />}>
      <SchemasContent />
    </Suspense>
  );
}
