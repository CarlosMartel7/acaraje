import { code, imp } from "ts-poet";

const useStats = imp("useStats@@/query/hooks/use-stats")

export const writeCrudOverviewApiCalls = () => code`
export default function AcarajeCalls_crudOverview() {
  const { data, isError } = ${useStats}();

  return { models: isError ? [] : (data?.modelsOverview ?? null) };
}
`.toString({ prefix: '"use client";' });

export default writeCrudOverviewApiCalls;
