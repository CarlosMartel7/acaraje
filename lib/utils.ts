import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFieldTypeColor(type: string, enumNames?: Set<string>): string {
  if (enumNames?.has(type)) return "text-chart-3";
  const t = type.toLowerCase();
  if (t.includes("int") || t === "float" || t === "decimal" || t === "bigint") return "text-chart-4";
  if (t.includes("string") || t === "json") return "text-primary-foreground";
  if (t.includes("bool") || t === "bytes") return "text-chart-1";
  if (t.includes("date") || t === "datetime") return "text-chart-5";
  return "text-muted-foreground";
}

export function getRelationTypeColor(type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many"): string {
  switch (type) {
    case "one-to-one":
      return "text-violet-400";
    case "one-to-many":
      return "text-primary-foreground";
    case "many-to-one":
      return "text-emerald-400";
    case "many-to-many":
      return "text-amber-400";
    default:
      return "text-muted-foreground";
  }
}
