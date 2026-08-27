import { code, imp } from "ts-poet";

const useQuery = imp("useQuery@@tanstack/react-query")
const apiGet = imp("apiGet@@/lib/query/api")
const queryKeys = imp("queryKeys@@/lib/query/keys")

export const writeUseRelationsHook = () => code`
export function useRelations() {
  return ${useQuery}({
    queryKey: ${queryKeys}.relations,
    queryFn: () => ${apiGet}<{ relations: Relations.Relation[] }>("/api/acaraje/relations"),
  });
}
`.toString({ prefix: '"use client";' });

export default writeUseRelationsHook;
