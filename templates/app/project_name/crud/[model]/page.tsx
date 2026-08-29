import { code, imp } from "ts-poet";

const Suspense = imp("Suspense@react")
const CrudListContent = imp("CrudListContent=@/components/routes/crud/[model]/index")
const CrudListSkeleton = imp("CrudListSkeleton@@/components/routes/skeletons")

export const writeCrudListPage = () => code`
export default function CrudListPage() {
  return (
    <${Suspense} fallback={<${CrudListSkeleton} />}>
      <${CrudListContent} />
    </${Suspense}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeCrudListPage;
