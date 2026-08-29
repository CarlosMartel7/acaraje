import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const GitBranch = imp("GitBranch@lucide-react")
const Filter = imp("Filter@lucide-react")
const cn = imp("cn@@/lib/utils")
const Input = imp("Input@@/components/ui/input")
const Tabs = imp("Tabs@@/components/ui/tabs")
const TabsContent = imp("TabsContent@@/components/ui/tabs")
const TabsList = imp("TabsList@@/components/ui/tabs")
const TabsTrigger = imp("TabsTrigger@@/components/ui/tabs")
const RelationModelCard = imp("RelationModelCard@./relation-model-card")
const RELATION_DOT = imp("RELATION_DOT@./relations-constants")
const RELATION_LABELS = imp("RELATION_LABELS@./relations-constants")
const relationTypeTabsTriggerClassName = imp("relationTypeTabsTriggerClassName@./relations-constants")
const RelationsHeader = imp("RelationsHeader@@/components/routes/skeletons")
const RelationsBodySkeleton = imp("RelationsBodySkeleton@@/components/routes/skeletons")
const AcarajeCalls_relations = imp("AcarajeCalls_relations=./[[api-calls]]")

export const writeRelationsContent = () => code`
export function RelationsContent() {
  const { allRelations, loading } = ${AcarajeCalls_relations}();
  const [filter, setFilter] = ${useState}<"all" | Relations.Relation["type"]>("all");
  const [search, setSearch] = ${useState}("");
  const [hoveredModel, setHoveredModel] = ${useState}<string | null>(null);

  const getFiltered = (f: typeof filter) =>
    allRelations.filter((r) => {
      if (f !== "all" && r.type !== f) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q);
      }
      return true;
    });

  const connectedModels = hoveredModel
    ? new Set(allRelations.filter((r) => r.from === hoveredModel || r.to === hoveredModel).flatMap((r) => [r.from, r.to]))
    : null;

  const filtered = getFiltered(filter);
  const groupByModel = (rels: Relations.Relation[]) =>
    rels.reduce<Record<string, Relations.Relation[]>>((acc, r) => {
      if (!acc[r.from]) acc[r.from] = [];
      acc[r.from].push(r);
      return acc;
    }, {});

  const typeCount = {
    "one-to-one": allRelations.filter((r) => r.type === "one-to-one").length,
    "one-to-many": allRelations.filter((r) => r.type === "one-to-many").length,
    "many-to-one": allRelations.filter((r) => r.type === "many-to-one").length,
    "many-to-many": allRelations.filter((r) => r.type === "many-to-many").length,
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <${RelationsHeader} />

      {loading ? (
        <${RelationsBodySkeleton} />
      ) : (
        <>
          {/* Search + count */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <${Filter} className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <${Input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by model name..."
                className="pl-9 text-xs font-mono h-8"
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {filtered.length} of {allRelations.length} relations
            </span>
          </div>

          <${Tabs} value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
            <${TabsList} className="flex flex-wrap h-auto gap-2 p-1 bg-transparent border-0">
              <${TabsTrigger}
                value="all"
                className="rounded-full text-xs font-mono data-[state=active]:bg-secondary data-[state=active]:border-border"
              >
                All
                <span className="bg-secondary/80 px-1.5 py-0.5 rounded ml-1">{allRelations.length}</span>
              </${TabsTrigger}>
              {(["one-to-many", "one-to-one", "many-to-one", "many-to-many"] as const).map((type) => (
                <${TabsTrigger} key={type} value={type} className={${relationTypeTabsTriggerClassName}(type)}>
                  <span className={${cn}("w-1.5 h-1.5 rounded-full mr-1.5", ${RELATION_DOT}[type])} />
                  {${RELATION_LABELS}[type]} · {type.replace(/-/g, " ")}
                  <span className="opacity-70 ml-1">{typeCount[type]}</span>
                </${TabsTrigger}>
              ))}
            </${TabsList}>

            {(["all", "one-to-many", "one-to-one", "many-to-one", "many-to-many"] as const).map((tabValue) => {
              const groupedForTab = groupByModel(getFiltered(tabValue));
              return (
                <${TabsContent} key={tabValue} value={tabValue} className="mt-4">
                  {Object.keys(groupedForTab).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <${GitBranch} className="w-10 h-10 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground">No relations found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedForTab).map(([fromModel, rels]) => (
                        <${RelationModelCard}
                          key={fromModel}
                          fromModel={fromModel}
                          rels={rels}
                          connectedModels={connectedModels}
                          onHoverModel={setHoveredModel}
                        />
                      ))}
                    </div>
                  )}
                </${TabsContent}>
              );
            })}
          </${Tabs}>
        </>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeRelationsContent;
