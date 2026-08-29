import { code, imp } from "ts-poet";

const CrudFormSkeleton = imp("CrudFormSkeleton@@/components/routes/skeletons")

export const writeCrudNewLoading = () => code`
export default function Loading() {
  return <${CrudFormSkeleton} />;
}
`;

export default writeCrudNewLoading;
