import { code, imp } from "ts-poet";

const useState = imp("useState@react")
const Link = imp("Link=next/link")
const Search = imp("Search@lucide-react")
const Table2 = imp("Table2@lucide-react")
const Braces = imp("Braces@lucide-react")
const acarajePath = imp("acarajePath@@/lib/acaraje-routes")
const Input = imp("Input@@/components/ui/input")
const Card = imp("Card@@/components/ui/card")
const Button = imp("Button@@/components/ui/button")
const CrudOverviewHeader = imp("CrudOverviewHeader@@/components/routes/skeletons")
const CrudOverviewBodySkeleton = imp("CrudOverviewBodySkeleton@@/components/routes/skeletons")
const AcarajeCalls_crudOverview = imp("AcarajeCalls_crudOverview=./[[api-calls]]")

export const writeCrudOverviewContent = () => code`
export function CrudOverviewContent() {
  const { models } = ${AcarajeCalls_crudOverview}();
  const [search, setSearch] = ${useState}("");

  const loading = models === null;
  const filteredModels = (models ?? []).filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 p-6 animate-in">
      <${CrudOverviewHeader}
        actions={
          !loading && (
            <div className="relative w-full sm:w-64">
              <${Search} className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <${Input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter models…"
                aria-label="Filter models"
                className="h-[38px] pl-9 text-xs"
              />
            </div>
          )
        }
      />

      {loading ? (
        <${CrudOverviewBodySkeleton} />
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
          {filteredModels.map((model) => (
            <${Card} key={model.name} className="p-[18px] transition-colors hover:border-primary/40">
              <div className="mb-[18px] flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/90">
                  <${Table2} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{model.name}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {model.recordCount.toLocaleString()} {model.recordCount === 1 ? "entry" : "entries"} · {model.fieldCount} fields
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <${Button} size="sm" asChild>
                  <${Link} href={${acarajePath}(\`/crud/\${model.name}\`)}>View table</${Link}>
                </${Button}>
                <${Button} size="sm" variant="outline" asChild>
                  <${Link} href={\`\${${acarajePath}("/schemas")}?model=\${model.name}\`}>View schema</${Link}>
                </${Button}>
              </div>
            </${Card}>
          ))}

          {filteredModels.length === 0 && (
            <div className="col-span-full flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
              <${Braces} className="h-4 w-4" />
              No models match &quot;{search}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeCrudOverviewContent;
