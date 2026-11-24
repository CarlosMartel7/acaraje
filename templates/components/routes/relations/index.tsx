import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const GitBranch = imp("GitBranch@lucide-react")
const Search = imp("Search@lucide-react")
const Input = imp("Input@@/components/ui/input")
const Tabs = imp("Tabs@@/components/ui/tabs")
const TabsContent = imp("TabsContent@@/components/ui/tabs")
const TabsList = imp("TabsList@@/components/ui/tabs")
const TabsTrigger = imp("TabsTrigger@@/components/ui/tabs")
const RelationModelCard = imp("RelationModelCard@./relation-model-card")
const RELATION_LABELS = imp("RELATION_LABELS@./relations-constants")
const RELATION_TYPES = imp("RELATION_TYPES@./relations-constants")
const RelationsHeader = imp("RelationsHeader@@/components/routes/skeletons")
const RelationsBodySkeleton = imp("RelationsBodySkeleton@@/components/routes/skeletons")
const AcarajeCalls_relations = imp("AcarajeCalls_relations=./[[api-calls]]")

export const writeRelationsContent = () => code`
type RelationFilter = "all" | Relations.Relation["type"];

function groupByModel(rels: Relations.Relation[]) {
  return rels.reduce<Record<string, Relations.Relation[]>>((acc, r) => {
    (acc[r.from] ??= []).push(r);
    return acc;
  }, {});
}

export function RelationsContent() {
  const { allRelations, loading } = ${AcarajeCalls_relations}();
  const [filter, setFilter] = ${useState}<RelationFilter>("all");
  const [search, setSearch] = ${useState}("");
  const [hoveredModel, setHoveredModel] = ${useState}<string | null>(null);

  const getFiltered = (f: RelationFilter) =>
    allRelations.filter((r) => {
      if (f !== "all" && r.type !== f) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q) || r.fromField.toLowerCase().includes(q);
      }
      return true;
    });

  const connectedModels = hoveredModel
    ? new Set(allRelations.filter((r) => r.from === hoveredModel || r.to === hoveredModel).flatMap((r) => [r.from, r.to]))
    : null;

  const typeCount = Object.fromEntries(
    ${RELATION_TYPES}.map((type) => [type, allRelations.filter((r) => r.type === type).length]),
  ) as Record<Relations.Relation["type"], number>;

  const modelCount = new Set(allRelations.map((r) => r.from)).size;
  const summary = loading
    ? undefined
    : \`\${allRelations.length} relation\${allRelations.length !== 1 ? "s" : ""} across \${modelCount} model\${modelCount !== 1 ? "s" : ""}\`;

  return (
    <div className="space-y-5 p-6 animate-in">
      <${RelationsHeader} summary={summary} />

      {loading ? (
        <${RelationsBodySkeleton} />
      ) : (
        <${Tabs} value={filter} onValueChange={(v) => setFilter(v as RelationFilter)}>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-[280px]">
              <${Search} className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <${Input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter relations…"
                aria-label="Filter relations"
                className="h-[38px] pl-9 text-xs"
              />
            </div>
            <${TabsList} aria-label="Relation type">
              <${TabsTrigger} value="all">All {allRelations.length}</${TabsTrigger}>
              {${RELATION_TYPES}.map((type) => (
                <${TabsTrigger} key={type} value={type} title={type.replace(/-/g, " ")} disabled={typeCount[type] === 0}>
                  {${RELATION_LABELS}[type]}
                  <span className="ml-1.5 opacity-60">{typeCount[type]}</span>
                </${TabsTrigger}>
              ))}
            </${TabsList}>
          </div>

          {(["all", ...${RELATION_TYPES}] as const).map((tabValue) => {
            const grouped = groupByModel(getFiltered(tabValue));
            return (
              <${TabsContent} key={tabValue} value={tabValue} className="mt-[18px]">
                {Object.keys(grouped).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <${GitBranch} className="mb-4 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No relations found</p>
                  </div>
                ) : (
                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
                    {Object.entries(grouped).map(([fromModel, rels]) => (
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
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeRelationsContent;
