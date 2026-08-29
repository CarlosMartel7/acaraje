import { code, imp } from "ts-poet";

const DriveUploadSkeleton = imp("DriveUploadSkeleton@@/components/routes/skeletons")

export const writeDriveUploadLoading = () => code`
export default function Loading() {
  return <${DriveUploadSkeleton} />;
}
`;

export default writeDriveUploadLoading;
