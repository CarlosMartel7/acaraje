import { code, imp } from "ts-poet";

const SchemasSkeleton = imp("SchemasSkeleton@@/components/routes/skeletons")

export const writeSchemasLoading = () => code`
export default function Loading() {
  return <${SchemasSkeleton} />;
}
`;

export default writeSchemasLoading;
