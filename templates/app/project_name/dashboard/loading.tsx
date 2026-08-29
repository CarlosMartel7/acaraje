import { code, imp } from "ts-poet";

const DashboardSkeleton = imp("DashboardSkeleton@@/components/routes/skeletons")

export const writeDashboardLoading = () => code`
export default function Loading() {
  return <${DashboardSkeleton} />;
}
`;

export default writeDashboardLoading;
