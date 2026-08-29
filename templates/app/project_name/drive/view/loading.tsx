import { code, imp } from "ts-poet";

const DriveViewSkeleton = imp("DriveViewSkeleton@@/components/routes/skeletons")

export const writeDriveViewLoading = () => code`
export default function Loading() {
  return <${DriveViewSkeleton} />;
}
`;

export default writeDriveViewLoading;
