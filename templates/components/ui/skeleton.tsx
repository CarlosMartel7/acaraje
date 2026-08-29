import { code, imp } from "ts-poet";

const cn = imp("cn@@/lib/utils")

export const writeSkeletonComponent = () => code`
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={${cn}("animate-pulse rounded-md bg-muted/50", className)} {...props} />;
}

export { Skeleton };
`.toString({ prefix: "// @ts-nocheck" });

export default writeSkeletonComponent;
