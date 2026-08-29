import { code, imp } from "ts-poet";

const useRelations = imp("useRelations@@/query/hooks/use-relations")

export const writeRelationsApiCalls = () => code`
export default function AcarajeCalls_relations() {
  const { data, isLoading } = ${useRelations}();

  return {
    allRelations: data?.relations || [],
    loading: isLoading,
  };
}
`;

export default writeRelationsApiCalls;
