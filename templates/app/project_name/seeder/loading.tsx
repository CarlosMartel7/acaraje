import { code, imp } from "ts-poet";

const SeederSkeleton = imp("SeederSkeleton@@/components/routes/skeletons")

export const writeSeederLoading = () => code`
export default function Loading() {
  return <${SeederSkeleton} />;
}
`;

export default writeSeederLoading;
