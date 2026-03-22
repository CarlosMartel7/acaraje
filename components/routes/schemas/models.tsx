"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
function ModelCard({ model, isSelected, onClick }: { model: Schema.Model; isSelected: boolean; onClick: () => void }) {
  const relationCount = model.fields.filter((f) => f.isRelation).length;
  const idField = model.fields.find((f) => f.isId);

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start h-auto rounded-lg border p-4 transition-all duration-150 group",
        isSelected
          ? "border-primary-foreground/40 bg-primary glow-primary-foreground-sm"
          : "border-border/50 bg-card/40 hover:border-border hover:bg-card/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold font-mono truncate", isSelected ? "text-primary-foreground" : "text-foreground")}>
              {model.name}
            </span>
            {model.mapName && <span className="text-[10px] font-mono text-muted-foreground/60">@{model.mapName}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] font-mono text-muted-foreground">{model.fields.length} fields</span>
            {relationCount > 0 && <span className="text-[11px] font-mono text-muted-foreground">{relationCount} relations</span>}
            {idField && <span className="text-[11px] font-mono text-muted-foreground/50">id: {idField.type}</span>}
          </div>
        </div>
      </div>
    </Button>
  );
}

export function SchemaModelsTab({
  models,
  selectedModelName,
  onSelectModel,
}: {
  models: Schema.Model[];
  selectedModelName: string | null;
  onSelectModel: (modelName: string) => void;
}) {
  return (
    <>
      {models.map((model) => (
        <ModelCard key={model.name} model={model} isSelected={selectedModelName === model.name} onClick={() => onSelectModel(model.name)} />
      ))}
    </>
  );
}
