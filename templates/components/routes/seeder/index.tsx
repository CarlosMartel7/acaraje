import { code, imp } from "ts-poet";

const Sprout = imp("Sprout@lucide-react")
const Loader2 = imp("Loader2@lucide-react")
const CheckCircle = imp("CheckCircle@lucide-react")
const AlertCircle = imp("AlertCircle@lucide-react")
const Database = imp("Database@lucide-react")
const ChevronDown = imp("ChevronDown@lucide-react")
const ChevronUp = imp("ChevronUp@lucide-react")
const Play = imp("Play@lucide-react")
const cn = imp("cn@@/lib/utils")
const Button = imp("Button@@/components/ui/button")
const Input = imp("Input@@/components/ui/input")
const Card = imp("Card@@/components/ui/card")
const SeederHeader = imp("SeederHeader@@/components/routes/skeletons")
const SeederBodySkeleton = imp("SeederBodySkeleton@@/components/routes/skeletons")
const SeederModelConfigButton = imp("SeederModelConfigButton@@/components/routes/seeder/config-panel")
const AcarajeCalls_seeder = imp("AcarajeCalls_seeder=./[[api-calls]]")

export const writeSeederIndexComponent = () => code`
export function SeederContent() {
  const { models, schema, seederConfig, setSeederConfig, counts, states, seedingAll, loading, updateState, seedModel, seedAll } =
    ${AcarajeCalls_seeder}();

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 space-y-6 animate-in">
      {loading ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <${SeederHeader} />
          </div>
          <${SeederBodySkeleton} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <${SeederHeader} />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-primary-foreground">{totalRecords.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">total records</div>
              </div>
              <${Button}
                variant="outline"
                onClick={seedAll}
                disabled={seedingAll}
                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              >
                {seedingAll ? <${Loader2} className="w-4 h-4 animate-spin" /> : <${Sprout} className="w-4 h-4" />}
                Seed All Models
              </${Button}>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400/80 text-xs">
            <${AlertCircle} className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Models are ordered by dependency — seed <strong>User</strong> and <strong>Category</strong> before models that reference
              them. Relational fields will auto-connect to existing records.
            </span>
          </div>

          {/* Model cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {models.map((model, idx) => {
              const state = states[model.name];
              if (!state) return null;
              const recordCount = counts[model.name] || 0;

              return (
                <${Card}
                  key={model.name}
                  className={${cn}(
                    "overflow-hidden transition-all",
                    state.result && state.result.errors.length === 0
                      ? "border-emerald-500/30"
                      : state.error
                        ? "border-destructive/30"
                        : "border-border/50",
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-[10px] font-mono text-muted-foreground">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono">{model.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/60">{model.fieldCount} fields</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <${Database} className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-xs font-mono text-muted-foreground">{recordCount.toLocaleString()} records</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <${Button}
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateState(model.name, { count: Math.max(1, state.count - 1) })}
                        className="h-6 w-6"
                      >
                        <${ChevronDown} className="w-3 h-3" />
                      </${Button}>
                      <${Input}
                        type="number"
                        min={1}
                        max={100}
                        value={state.count}
                        onChange={(e) => updateState(model.name, { count: parseInt(e.target.value) || 1 })}
                        className="w-12 text-center text-xs font-mono h-8 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <${Button}
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateState(model.name, { count: Math.min(100, state.count + 1) })}
                        className="h-6 w-6"
                      >
                        <${ChevronUp} className="w-3 h-3" />
                      </${Button}>
                    </div>

                    <${SeederModelConfigButton}
                      modelName={model.name}
                      schema={schema}
                      config={seederConfig}
                      onConfigChange={setSeederConfig}
                    />

                    <${Button}
                      variant="outline"
                      size="sm"
                      onClick={() => seedModel(model.name)}
                      disabled={state.loading}
                      className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      {state.loading ? <${Loader2} className="w-3 h-3 animate-spin" /> : <${Play} className="w-3 h-3" />}
                      Seed
                    </${Button}>
                  </div>

                  {state.result && (
                    <div
                      className={${cn}(
                        "px-4 py-2 border-t text-xs font-mono flex items-center gap-2",
                        state.result.errors.length > 0
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                          : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
                      )}
                    >
                      <${CheckCircle} className="w-3 h-3 flex-shrink-0" />
                      <span>Created {state.result.created} records</span>
                      {state.result.errors.length > 0 && (
                        <${Button}
                          variant="ghost"
                          size="sm"
                          onClick={() => updateState(model.name, { expanded: !state.expanded })}
                          className="ml-auto h-auto py-0 text-amber-400/70 hover:text-amber-400"
                        >
                          {state.result.errors.length} errors ▾
                        </${Button}>
                      )}
                    </div>
                  )}

                  {state.expanded && state.result && state.result.errors.length > 0 && (
                    <div className="px-4 pb-3 space-y-1">
                      {state.result.errors.map((e, i) => (
                        <p key={i} className="text-[10px] font-mono text-red-400/80 bg-red-400/5 rounded px-2 py-1">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}

                  {state.error && (
                    <div className="px-4 py-2 border-t border-destructive/20 bg-destructive/5 text-xs font-mono text-red-400 flex items-center gap-2">
                      <${AlertCircle} className="w-3 h-3 flex-shrink-0" />
                      {state.error}
                    </div>
                  )}
                </${Card}>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSeederIndexComponent;
