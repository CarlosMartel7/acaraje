import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const useSearchParams = imp("useSearchParams@next/navigation")
const useRouter = imp("useRouter@next/navigation")
const Search = imp("Search@lucide-react")
const Input = imp("Input@@/components/ui/input")
const Card = imp("Card@@/components/ui/card")
const Tabs = imp("Tabs@@/components/ui/tabs")
const TabsContent = imp("TabsContent@@/components/ui/tabs")
const TabsList = imp("TabsList@@/components/ui/tabs")
const TabsTrigger = imp("TabsTrigger@@/components/ui/tabs")
const SchemaModelsTab = imp("SchemaModelsTab@./models")
const SchemaEnumsTab = imp("SchemaEnumsTab@./enums")
const SchemaModelViewer = imp("SchemaModelViewer@./viewer")
const AcarajeCalls_schemas = imp("AcarajeCalls_schemas=./[[api-calls]]")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const SchemasHeader = imp("SchemasHeader@@/components/routes/skeletons")
const SchemasSidebarBodySkeleton = imp("SchemasSidebarBodySkeleton@@/components/routes/skeletons")
const SchemasViewerSkeleton = imp("SchemasViewerSkeleton@@/components/routes/skeletons")

export const writeSchemasContent = () => code`
export function SchemasContent() {
  const [search, setSearch] = ${useState}("");
  const [activeTab, setActiveTab] = ${useState}<"models" | "enums">("models");
  const router = ${useRouter}();

  const searchParams = ${useSearchParams}();
  const selectedModelName = searchParams.get("model");
  const tabParam = searchParams.get("tab");

  const { data, filteredModels, filteredEnums, selectedModel, recordCounts, handleSelectModel } = ${AcarajeCalls_schemas}({
    search,
    setActiveTab,
    tabParam: tabParam ?? "models",
    selectedModelName: selectedModelName ?? "",
    router,
  });

  const loading = !data;

  return (
    <div className="space-y-5 p-6 animate-in">
      <${SchemasHeader} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        <${Card} className="p-4">
          {loading ? (
            <${SchemasSidebarBodySkeleton} />
          ) : (
            <${Tabs}
              value={activeTab}
              onValueChange={(v) => {
                const tab = v as "models" | "enums";
                setActiveTab(tab);
                const q = new URLSearchParams();
                q.set("tab", tab);
                if (tab === "models" && selectedModelName) q.set("model", selectedModelName);
                router.replace(\`\${${acarajePath}("/schemas")}?\${q.toString()}\`);
              }}
            >
              <${TabsList}>
                <${TabsTrigger} value="models">Models ({data.models.length})</${TabsTrigger}>
                <${TabsTrigger} value="enums">Enums ({data.enums.length})</${TabsTrigger}>
              </${TabsList}>

              <div className="relative mt-3.5">
                <${Search} className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <${Input}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={activeTab === "models" ? "Filter models…" : "Filter enums…"}
                  aria-label={activeTab === "models" ? "Filter models" : "Filter enums"}
                  className="h-[38px] pl-9 text-xs"
                />
              </div>

              <${TabsContent} value="models" className="max-h-[calc(100vh-18rem)] overflow-y-auto">
                <${SchemaModelsTab}
                  models={filteredModels}
                  selectedModelName={selectedModel?.name ?? null}
                  onSelectModel={handleSelectModel}
                />
              </${TabsContent}>
              <${TabsContent} value="enums" className="max-h-[calc(100vh-18rem)] overflow-y-auto">
                <${SchemaEnumsTab} enums={filteredEnums} />
              </${TabsContent}>
            </${Tabs}>
          )}
        </${Card}>

        {loading ? (
          <${SchemasViewerSkeleton} />
        ) : (
          <${SchemaModelViewer}
            model={selectedModel}
            recordCount={selectedModel ? recordCounts[selectedModel.name] : undefined}
            modelsCount={data.models.length}
            enumNames={new Set(data.enums.map((e) => e.name))}
          />
        )}
      </div>
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSchemasContent;
