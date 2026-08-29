import { code, imp } from "ts-poet";

const CrudOverviewSkeleton = imp("CrudOverviewSkeleton@@/components/routes/skeletons")

export const writeCrudOverviewLoading = () => code`
export default function Loading() {
  return <${CrudOverviewSkeleton} />;
}
`;

export default writeCrudOverviewLoading;
