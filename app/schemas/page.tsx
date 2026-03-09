"use client";

import { Suspense } from "react";
import { SchemasContent } from "@/components/routes/schemas/schemas-content";

export default function SchemasPage() {
  return (
    <Suspense>
      <SchemasContent />
    </Suspense>
  );
}
