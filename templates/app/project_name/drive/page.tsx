import { code, imp } from "ts-poet";

const Suspense = imp("Suspense@react")
const DrivePageInner = imp("DrivePageInner=@/components/routes/drive")
const DriveUploadSkeleton = imp("DriveUploadSkeleton@@/components/routes/skeletons")

export const writeDriveUploadPage = () => code`
export default function DrivePage() {
  return (
    <${Suspense} fallback={<${DriveUploadSkeleton} />}>
      <${DrivePageInner} />
    </${Suspense}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeDriveUploadPage;
