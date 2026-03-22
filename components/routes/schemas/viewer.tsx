"use client";

import { Tag, Hash, Key, Link2 } from "lucide-react";
import { cn, getFieldTypeColor } from "@/lib/utils";
import { Card } from "@/components/ui/card";

function FieldBadge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border",
        color || "text-muted-foreground border-border/50 bg-secondary/30",
      )}
    >
      {children}
    </span>
  );
}

function FieldRow({ field, enumNames }: { field: Schema.Field; enumNames: Set<string> }) {
  const relationAttr = field.attributes.find((a) => a.startsWith("@relation"));

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-border/30 hover:bg-accent/20 transition-colors group">
      <div className="w-5 flex-shrink-0 flex items-center justify-center pt-0.5">
        {field.isId ? (
          <Key className="w-3 h-3 text-chart-1" />
        ) : field.isRelation ? (
          <Link2 className="w-3 h-3 text-chart-5" />
        ) : (
          <Hash className="w-3 h-3 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-foreground">{field.name}</span>
          {field.isRelation ? (
            <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5 min-w-0 max-w-full">
              <span className={cn("text-sm font-mono font-medium", getFieldTypeColor(field.type, enumNames))}>
                {field.type}
                {field.isList && "[]"}
                {!field.isRequired && "?"}
              </span>
              {field.relationFields && field.relationFields.length > 0 && (
                <span className="text-[10px] font-mono text-muted-foreground/90 shrink-0">· via {field.relationFields.join(", ")}</span>
              )}
              {relationAttr && <code className="text-[10px] font-mono text-chart-5/95 leading-snug break-all">{relationAttr}</code>}
            </div>
          ) : (
            <span className={cn("text-sm font-mono font-medium", getFieldTypeColor(field.type, enumNames))}>
              {field.type}
              {field.isList && "[]"}
              {!field.isRequired && "?"}
            </span>
          )}
        </div>
        {(field.isId ||
          field.isUnique ||
          field.hasDefault ||
          (field.isRelation && field.attributes.some((a) => !a.startsWith("@relation")))) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {field.isId && <FieldBadge color="text-chart-1 border-chart-1/30 bg-chart-1/5">@id</FieldBadge>}
            {field.isUnique && <FieldBadge color="text-chart-5 border-chart-5/30 bg-chart-5/5">@unique</FieldBadge>}
            {field.hasDefault && (
              <FieldBadge color="text-chart-4 border-chart-4/30 bg-chart-4/5">@default({field.defaultValue})</FieldBadge>
            )}
            {field.isRelation &&
              field.attributes
                .filter((a) => !a.startsWith("@relation"))
                .map((a) => (
                  <FieldBadge key={a} color="text-muted-foreground border-border/40 bg-secondary/20">
                    {a}
                  </FieldBadge>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SchemaModelViewer({
  model,
  modelsCount,
  enumNames,
}: {
  model: Schema.Model | null;
  modelsCount: number;
  enumNames: Set<string>;
}) {
  if (model) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold font-mono text-primary-foreground">{model.name}</h2>
              {model.mapName && (
                <span className="px-2 py-0.5 rounded text-xs font-mono border border-border/50 text-muted-foreground">
                  {`@@map("${model.mapName}")`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span>{model.fields.length} fields</span>
              <span>{model.fields.filter((f) => f.isRelation).length} relations</span>
              <span>{model.indexes.length} indexes</span>
            </div>
          </div>

          <Card className="overflow-hidden border-border/50">
            <div className="px-4 py-2.5 border-b border-border/50 bg-secondary/30 flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Fields</span>
            </div>
            {model.fields.map((field) => (
              <FieldRow key={field.name} field={field} enumNames={enumNames} />
            ))}
          </Card>

          {model.indexes.length > 0 && (
            <Card className="mt-4 overflow-hidden border-border/50">
              <div className="px-4 py-2.5 border-b border-border/50 bg-secondary/30 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Indexes & Constraints</span>
              </div>
              {model.indexes.map((idx, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5 border-b border-border/30 last:border-0 font-mono text-xs text-muted-foreground hover:bg-accent/20 transition-colors"
                >
                  {idx}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <Tag className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground text-sm">Select a model to inspect its fields</p>
        <p className="text-muted-foreground/50 text-xs mt-1 font-mono">{modelsCount} models available</p>
      </div>
    </div>
  );
}
