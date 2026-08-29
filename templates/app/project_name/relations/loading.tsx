import { code, imp } from "ts-poet";

const RelationsSkeleton = imp("RelationsSkeleton@@/components/routes/skeletons")

export const writeRelationsLoading = () => code`
export default function Loading() {
  return <${RelationsSkeleton} />;
}
`;

export default writeRelationsLoading;
