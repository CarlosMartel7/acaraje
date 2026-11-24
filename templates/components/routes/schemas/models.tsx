import { code, imp } from "ts-poet";

const Table2 = imp("Table2@lucide-react")
const cn = imp("cn@@/lib/utils")

export const writeSchemaModelsTab = () => code`
export function SchemaModelsTab({
  models,
  selectedModelName,
  onSelectModel,
}: {
  models: Schema.Model[];
  selectedModelName: string | null;
  onSelectModel: (modelName: string) => void;
}) {
  if (models.length === 0) {
    return <p className="px-3.5 py-6 text-center text-xs text-muted-foreground">No models match your filter</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {models.map((model) => {
        const isSelected = selectedModelName === model.name;
        return (
          <li key={model.name}>
            <button
              type="button"
              onClick={() => onSelectModel(model.name)}
              aria-current={isSelected ? "true" : undefined}
              className={${cn}(
                "flex w-full items-center gap-2.5 rounded-lg px-3.5 py-[11px] text-left text-[13px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isSelected
                  ? "bg-accent text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]"
                  : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <${Table2} className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{model.name}</span>
              {model.mapName && <span className="truncate font-mono text-[10px] text-muted-foreground">@{model.mapName}</span>}
              <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground">{model.fields.length} fields</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
`.toString({ prefix: '"use client";' });

export default writeSchemaModelsTab;
