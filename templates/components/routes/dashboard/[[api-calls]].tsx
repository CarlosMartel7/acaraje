import { code, imp } from "ts-poet";

const useStats = imp("useStats@@/query/hooks/use-stats")

export const writeDashboardApiCalls = () => code`
export default function AcarajeCalls_dashboard() {
  const { data, isError } = ${useStats}();

  return { stats: isError ? null : (data ?? null) };
}
`;

export default writeDashboardApiCalls;
