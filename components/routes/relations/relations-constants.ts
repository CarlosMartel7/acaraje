import { cn } from "@/lib/utils";

export const RELATION_LABELS = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-one": "N:1",
  "many-to-many": "N:M",
} as const;

export const RELATION_COLORS = {
  "one-to-one": "border-violet-500/40 bg-violet-500/5 text-violet-400",
  "one-to-many": "border-primary-foreground/40 bg-primary-foreground/5 text-primary-foreground",
  "many-to-one": "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
  "many-to-many": "border-amber-500/40 bg-amber-500/5 text-amber-400",
} as const;

export const RELATION_DOT = {
  "one-to-one": "bg-violet-400",
  "one-to-many": "bg-primary-foreground",
  "many-to-one": "bg-emerald-400",
  "many-to-many": "bg-amber-400",
} as const;

const RELATION_TYPE_TAB_BASE =
  "rounded-full text-xs font-mono data-[state=active]:border data-[state=active]:border-current";

const RELATION_TYPE_TAB_ACTIVE: Record<Relations.Relation["type"], string> = {
  "one-to-one":
    "data-[state=active]:border-violet-500/40 data-[state=active]:bg-violet-500/5 data-[state=active]:text-violet-400",
  "one-to-many":
    "data-[state=active]:border-primary-foreground/40 data-[state=active]:bg-primary-foreground/5 data-[state=active]:text-primary-foreground",
  "many-to-one":
    "data-[state=active]:border-emerald-500/40 data-[state=active]:bg-emerald-500/5 data-[state=active]:text-emerald-400",
  "many-to-many":
    "data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/5 data-[state=active]:text-amber-400",
};

export function relationTypeTabsTriggerClassName(type: Relations.Relation["type"]): string {
  return cn(RELATION_TYPE_TAB_BASE, RELATION_TYPE_TAB_ACTIVE[type]);
}
