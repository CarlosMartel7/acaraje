import { code, imp } from "ts-poet";

const CrudListSkeleton = imp("CrudListSkeleton@@/components/routes/skeletons")

export const writeCrudListLoading = () => code`
export default function Loading() {
  return <${CrudListSkeleton} />;
}
`;

export default writeCrudListLoading;
