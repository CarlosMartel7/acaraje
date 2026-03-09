import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFieldTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    String: "text-chart-4",
    Int: "text-chart-5",
    Float: "text-chart-5",
    Decimal: "text-chart-5",
    Boolean: "text-chart-1",
    DateTime: "text-primary-foreground",
    Json: "text-rose-custom",
    Bytes: "text-rose-custom",
    BigInt: "text-chart-5",
  };
  // Enums and relations
  if (type[0] === type[0].toUpperCase() && !typeColors[type]) {
    return "text-chart-1";
  }
  return typeColors[type] || "text-muted-foreground";
}

export function getRelationTypeColor(type: string): string {
  const map: Record<string, string> = {
    "one-to-one": "text-chart-5",
    "one-to-many": "text-primary-foreground",
    "many-to-one": "text-chart-4",
    "many-to-many": "text-chart-1",
  };
  return map[type] || "text-muted-foreground";
}
