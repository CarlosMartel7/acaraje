import { code, imp } from "ts-poet";

const useQuery = imp("useQuery@@tanstack/react-query")
const apiGet = imp("apiGet@@/lib/query/api")
const queryKeys = imp("queryKeys@@/lib/query/keys")

export const writeUseSchemasHook = () => code`
export function useSchemas() {
  return ${useQuery}({
    queryKey: ${queryKeys}.schemas,
    queryFn: () => ${apiGet}<Schema.SchemaData>("/api/schemas"),
  });
}
`.toString({ prefix: '"use client";' });

export default writeUseSchemasHook;
