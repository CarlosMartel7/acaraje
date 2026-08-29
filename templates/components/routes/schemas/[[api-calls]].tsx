import { code, imp } from "ts-poet";

const useRouter = imp("useRouter@next/navigation")
const useEffect = imp("useEffect@react")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const useSchemas = imp("useSchemas@@/query/hooks/use-schemas")

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

  ${useEffect}(() => {
    if (tabParam === "enums" || tabParam === "enum") setActiveTab("enums");
    else if (tabParam === "models") setActiveTab("models");
  }, [tabParam]);

  const filteredModels = data?.models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) || [];

  const filteredEnums = data?.enums.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) || [];

  const selectedModel = data?.models.find((m) => m.name === selectedModelName) ?? null;

  const handleSelectModel = (modelName: string) => {
    const params = new URLSearchParams();
    params.set("tab", "models");
    if (selectedModelName !== modelName) params.set("model", modelName);
    router.push(\`\${${acarajePath}("/schemas")}?\${params.toString()}\`);
  };

  return { data: data ?? null, filteredModels, filteredEnums, selectedModel, handleSelectModel, router };
}
`.toString({ prefix: '"use client";' });

export default writeSchemasApiCalls;
