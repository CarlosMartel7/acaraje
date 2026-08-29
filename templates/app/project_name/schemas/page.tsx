import { code, imp } from "ts-poet";

const Suspense = imp("Suspense@react")
const SchemasContent = imp("SchemasContent@@/components/routes/schemas")
const SchemasSkeleton = imp("SchemasSkeleton@@/components/routes/skeletons")

export const writeSchemasPage = () => code`
export default function SchemasPage() {
  return (
    <${Suspense} fallback={<${SchemasSkeleton} />}>
      <${SchemasContent} />
    </${Suspense}>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSchemasPage;
