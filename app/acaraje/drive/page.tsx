"use client";

import { Suspense } from "react";
import DrivePageInner from "@/components/routes/drive";
import { DriveUploadSkeleton } from "@/components/routes/skeletons";

export default function DrivePage() {
  return (
    <Suspense fallback={<DriveUploadSkeleton />}>
      <DrivePageInner />
    </Suspense>
  );
}
