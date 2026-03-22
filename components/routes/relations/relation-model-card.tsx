"use client";

import { ArrowRight } from "lucide-react";
import { cn, getRelationTypeColor } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { RELATION_COLORS, RELATION_LABELS } from "./relations-constants";

type RelationModelCardProps = {
  fromModel: string;
  rels: Relations.Relation[];
  connectedModels: Set<string> | null;
  onHoverModel: (model: string | null) => void;
};

export function RelationModelCard({
  fromModel,
  rels,
  connectedModels,
  onHoverModel,
}: RelationModelCardProps) {
  const dimmed = connectedModels !== null && !connectedModels.has(fromModel);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        dimmed ? "opacity-30" : "opacity-100",
      )}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-secondary/20"
        onMouseEnter={() => onHoverModel(fromModel)}
        onMouseLeave={() => onHoverModel(null)}
      >
        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
        <span className="text-sm font-bold font-mono text-primary-foreground">{fromModel}</span>
        <span className="text-xs font-mono text-muted-foreground/60">
          {rels.length} relation{rels.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-border/30">
        {rels.map((rel, i) => (
          <div
            key={`${rel.from}-${rel.fromField}-${rel.to}-${i}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-accent/20 transition-colors group"
            onMouseEnter={() => onHoverModel(rel.to)}
            onMouseLeave={() => onHoverModel(null)}
          >
            <span className="text-sm font-mono text-muted-foreground w-32 truncate">
              .{rel.fromField}
            </span>
            <span
              className={cn(
                "flex-shrink-0 inline-flex items-center justify-center w-8 h-5 text-[10px] font-bold font-mono rounded border",
                RELATION_COLORS[rel.type],
              )}
            >
              {RELATION_LABELS[rel.type]}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
            <span
              className={cn(
                "text-sm font-mono font-medium flex-1",
                getRelationTypeColor(rel.type),
              )}
            >
              {rel.to}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {rel.type.replace(/-/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
