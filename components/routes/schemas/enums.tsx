"use client";

import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
export function SchemaEnumsTab({ enums }: { enums: Schema.EnumType[] }) {
  return (
    <>
      {enums.map((enumType) => (
        <Card key={enumType.name} className="border-border/50 bg-card/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-3.5 h-3.5 text-chart-1" />
            <span className="text-sm font-bold font-mono text-chart-1">{enumType.name}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {enumType.values.map((v) => (
              <span
                key={v}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-secondary/50 border border-border/50 text-muted-foreground"
              >
                {v}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
