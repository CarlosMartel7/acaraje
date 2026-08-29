import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const useSearchParams = imp("useSearchParams@next/navigation")
const useRouter = imp("useRouter@next/navigation")
const Search = imp("Search@lucide-react")
const Input = imp("Input@@/components/ui/input")
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

  const { data, filteredModels, filteredEnums, selectedModel, handleSelectModel } = ${AcarajeCalls_schemas}({
    search,
    setActiveTab,
    tabParam: tabParam ?? "models",
    selectedModelName: selectedModelName ?? "",
    router,
  });

  const loading = !data;

  return (
    <div className="flex h-full animate-in">
      <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col min-h-0">
        <div className="p-4 border-b border-border/50 shrink-0">
          <${SchemasHeader} />
          <div className="relative">
            <${Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <${Input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "models" ? "Search models..." : "Search enums..."}
              className="pl-9 text-xs font-mono h-8"
            />
          </div>
        </div>
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
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-4 pt-3 pb-2 shrink-0">
              <${TabsList} className="w-full">
                <${TabsTrigger} value="models" className="flex-1">
                  Models ({data?.models.length ?? "—"})
                </${TabsTrigger}>
                <${TabsTrigger} value="enums" className="flex-1">
                  Enums ({data?.enums.length ?? "—"})
                </${TabsTrigger}>
              </${TabsList}>
            </div>
            <${TabsContent} value="models" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0 min-h-0">
              <${SchemaModelsTab} models={filteredModels} selectedModelName={selectedModelName} onSelectModel={handleSelectModel} />
            </${TabsContent}>
            <${TabsContent} value="enums" className="flex-1 overflow-y-auto p-3 space-y-2 mt-0 min-h-0">
              <${SchemaEnumsTab} enums={filteredEnums} />
            </${TabsContent}>
          </${Tabs}>
        )}
      </div>

      {loading ? (
        <${SchemasViewerSkeleton} />
      ) : (
        <${SchemaModelViewer}
          model={selectedModel}
          modelsCount={data?.models.length ?? 0}
          enumNames={new Set(data?.enums.map((e) => e.name) ?? [])}
        />
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSchemasContent;
