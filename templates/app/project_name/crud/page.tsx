import { code, imp } from "ts-poet";

const Suspense = imp("Suspense@react")
const CrudOverviewContent = imp("CrudOverviewContent@@/components/routes/crud/index")
const CrudOverviewSkeleton = imp("CrudOverviewSkeleton@@/components/routes/skeletons")

export const writeCrudOverviewPage = () => code`
export default function CrudOverviewPage() {
  return (
    <${Suspense} fallback={<${CrudOverviewSkeleton} />}>
      <${CrudOverviewContent} />
    </${Suspense}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeCrudOverviewPage;
