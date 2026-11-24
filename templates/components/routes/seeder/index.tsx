import { code, imp } from "ts-poet";

const Sprout = imp("Sprout@lucide-react")
const Loader2 = imp("Loader2@lucide-react")
const CheckCircle = imp("CheckCircle@lucide-react")
const AlertCircle = imp("AlertCircle@lucide-react")
const AlertTriangle = imp("AlertTriangle@lucide-react")
const ChevronDown = imp("ChevronDown@lucide-react")
const Minus = imp("Minus@lucide-react")
const Plus = imp("Plus@lucide-react")
const Table2 = imp("Table2@lucide-react")
const cn = imp("cn@@/lib/utils")
const Button = imp("Button@@/components/ui/button")
const Card = imp("Card@@/components/ui/card")
const SeederHeader = imp("SeederHeader@@/components/routes/skeletons")
const SeederBodySkeleton = imp("SeederBodySkeleton@@/components/routes/skeletons")
const SeederModelConfigButton = imp("SeederModelConfigButton@@/components/routes/seeder/config-panel")
const AcarajeCalls_seeder = imp("AcarajeCalls_seeder=./[[api-calls]]")

export const writeSeederIndexComponent = () => code`
const MIN_COUNT = 1;
const MAX_COUNT = 100;
const clampCount = (n: number) => Math.min(MAX_COUNT, Math.max(MIN_COUNT, n));

function CountStepper({ modelName, value, onChange }: { modelName: string; value: number; onChange: (value: number) => void }) {
  const stepButton =
    "flex h-[30px] w-[30px] items-center justify-center bg-muted text-foreground transition-colors hover:bg-accent disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-input">
      <button type="button" className={stepButton} onClick={() => onChange(clampCount(value - 1))} disabled={value <= MIN_COUNT} aria-label={\`Seed fewer \${modelName} records\`}>
        <${Minus} className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        min={MIN_COUNT}
        max={MAX_COUNT}
        value={value}
        onChange={(e) => onChange(clampCount(parseInt(e.target.value) || MIN_COUNT))}
        aria-label={\`Number of \${modelName} records to seed\`}
        className="h-[30px] w-[38px] border-0 bg-transparent text-center text-xs text-foreground [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={stepButton} onClick={() => onChange(clampCount(value + 1))} disabled={value >= MAX_COUNT} aria-label={\`Seed more \${modelName} records\`}>
        <${Plus} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SeederContent() {
  const { models, schema, seederConfig, setSeederConfig, counts, states, seedingAll, loading, updateState, seedModel, seedAll } =
    ${AcarajeCalls_seeder}();

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="space-y-5 p-6">
        <${SeederHeader} />
        <${SeederBodySkeleton} />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6 animate-in">
      <${SeederHeader}
        actions={
          <${Button} size="lg" onClick={seedAll} disabled={seedingAll} className="h-10 px-5 text-xs">
            {seedingAll ? <${Loader2} className="h-4 w-4 animate-spin" /> : <${Sprout} className="h-4 w-4" />}
            Seed All Models
          </${Button}>
        }
      />

      <div className="flex flex-wrap gap-4">
        <${Card} className="flex items-center gap-2.5 px-[22px] py-3.5">
          <span className="text-xs text-muted-foreground">Total records</span>
          <b className="text-[22px] font-bold">{totalRecords.toLocaleString()}</b>
        </${Card}>
        {models.length > 1 && (
          <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-[18px] py-3.5 text-xs text-warning">
            <${AlertTriangle} className="h-4 w-4 flex-shrink-0" />
            <p>
              Models are seeded in dependency order: {models.map((m) => m.name).join(" → ")}. Relational fields connect to existing
              records, so seed referenced models first.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        {models.map((model) => {
          const state = states[model.name];
          if (!state) return null;
          const recordCount = counts[model.name] || 0;
          const hasErrors = !!state.result && state.result.errors.length > 0;

          return (
            <${Card}
              key={model.name}
              className={${cn}(
                "overflow-hidden transition-colors",
                state.result && !hasErrors && "border-success/40",
                (state.error || hasErrors) && "border-warning/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-3.5 p-[18px]">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/90">
                  <${Table2} className="h-4 w-4" />
                </span>
                <div className="min-w-[110px] flex-1">
                  <h2 className="truncate text-sm font-semibold">{model.name}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {recordCount.toLocaleString()} {recordCount === 1 ? "record" : "records"} · {model.fieldCount} fields
                  </p>
                </div>

                <CountStepper modelName={model.name} value={state.count} onChange={(count) => updateState(model.name, { count })} />

                <${SeederModelConfigButton} modelName={model.name} schema={schema} config={seederConfig} onConfigChange={setSeederConfig} />

                <${Button} size="sm" onClick={() => seedModel(model.name)} disabled={state.loading}>
                  {state.loading && <${Loader2} className="h-3.5 w-3.5 animate-spin" />}
                  Seed
                </${Button}>
              </div>

              {state.result && (
                <div
                  className={${cn}(
                    "flex items-center gap-2 border-t px-[18px] py-2.5 text-xs",
                    hasErrors ? "border-warning/20 bg-warning/5 text-warning" : "border-success/20 bg-success/5 text-success",
                  )}
                >
                  <${CheckCircle} className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Created {state.result.created} records</span>
                  {hasErrors && (
                    <button
                      type="button"
                      onClick={() => updateState(model.name, { expanded: !state.expanded })}
                      aria-expanded={state.expanded}
                      className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-warning/80 transition-colors hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/50"
                    >
                      {state.result.errors.length} errors
                      <${ChevronDown} className={${cn}("h-3 w-3 transition-transform", state.expanded && "rotate-180")} />
                    </button>
                  )}
                </div>
              )}

              {state.expanded && hasErrors && (
                <ul className="space-y-1 px-[18px] pb-3">
                  {state.result!.errors.map((e, i) => (
                    <li key={i} className="rounded-md bg-destructive/10 px-2 py-1 font-mono text-[10px] text-red-400">
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              {state.error && (
                <div className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/5 px-[18px] py-2.5 text-xs text-red-400">
                  <${AlertCircle} className="h-3.5 w-3.5 flex-shrink-0" />
                  {state.error}
                </div>
              )}
            </${Card}>
          );
        })}
      </div>
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSeederIndexComponent;
