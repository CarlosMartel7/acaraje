import { code, imp } from "ts-poet";

const useRouter = imp("useRouter@next/navigation")
const useEffect = imp("useEffect@react")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")
const useStats = imp("useStats@@/query/hooks/use-stats")

export const writeSchemasApiCalls = () => code`
interface AcarajeCalls_schemasProps {
  search: string;
  setActiveTab: (activeTab: "models" | "enums") => void;
  tabParam: string;
  selectedModelName: string;
  router: ReturnType<typeof ${useRouter}>;
}

export default function AcarajeCalls_schemas({ search, setActiveTab, tabParam, selectedModelName, router }: AcarajeCalls_schemasProps) {
  const { data } = ${useSchemas}();
  const { data: stats } = ${useStats}();

  ${useEffect}(() => {
    if (tabParam === "enums" || tabParam === "enum") setActiveTab("enums");
    else if (tabParam === "models") setActiveTab("models");
  }, [tabParam]);

  const filteredModels = data?.models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) || [];

  const filteredEnums = data?.enums.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) || [];

  // Fall back to the first model so the viewer is never empty when the URL names no (or an unknown) model.
  const selectedModel = data?.models.find((m) => m.name === selectedModelName) ?? data?.models[0] ?? null;

  const recordCounts: Record<string, number> = Object.fromEntries(
    (stats?.modelsOverview ?? []).map((m) => [m.name, m.recordCount]),
  );

  const handleSelectModel = (modelName: string) => {
    const params = new URLSearchParams();
    params.set("tab", "models");
    params.set("model", modelName);
    router.push(\`\${${acarajePath}("/schemas")}?\${params.toString()}\`);
  };

  return { data: data ?? null, filteredModels, filteredEnums, selectedModel, recordCounts, handleSelectModel, router };
}
`.toString({ prefix: '"use client";' });

export default writeSchemasApiCalls;
