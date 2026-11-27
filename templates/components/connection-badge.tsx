import { code, imp } from "ts-poet";

const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")

export const writeConnectionBadgeComponent = () => code`
export function ConnectionBadge() {
  const { data } = ${useSchemas}();
  const provider = data?.datasource?.provider ?? "postgresql";

  return <span>CONNECTED · {provider}</span>;
}
`.toString({ prefix: '"use client";' });

export default writeConnectionBadgeComponent;
