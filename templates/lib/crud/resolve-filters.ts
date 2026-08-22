import { code } from "ts-poet";

const body = code`

/**
 * Classifies Prisma field types into filter/sort "kinds" and defines which operators are valid
 * for each. Pure, no Node imports — safe to import from both API routes and client components
 */

export type FieldKind = "string" | "number" | "boolean" | "datetime" | "enum";

export type FilterOperator = "contains" | "startsWith" | "endsWith" | "equals" | "not" | "gt" | "gte" | "lt" | "lte";

const NUMBER_TYPES = new Set(["Int", "Float", "Decimal"]);

interface FieldLike {
  type: string;
  isRelation: boolean;
  isList: boolean;
}

export function getFieldKind(fieldType: string, enumNames: Set<string> | string[]): FieldKind | null {
  if (fieldType === "String") return "string";
  if (NUMBER_TYPES.has(fieldType)) return "number";
  if (fieldType === "Boolean") return "boolean";
  if (fieldType === "DateTime") return "datetime";
  const enumSet = enumNames instanceof Set ? enumNames : new Set(enumNames);
  if (enumSet.has(fieldType)) return "enum";
  return null;
}

export function isFilterableField(field: FieldLike, enumNames: Set<string> | string[]): boolean {
  if (field.isRelation || field.isList) return false;
  return getFieldKind(field.type, enumNames) !== null;
}

export const OPERATORS_BY_KIND: Record<FieldKind, { value: FilterOperator; label: string }[]> = {
  string: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "startsWith", label: "starts with" },
    { value: "endsWith", label: "ends with" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "gt", label: ">" },
    { value: "gte", label: ">=" },
    { value: "lt", label: "<" },
    { value: "lte", label: "<=" },
  ],
  datetime: [
    { value: "equals", label: "on" },
    { value: "gt", label: "after" },
    { value: "gte", label: "on or after" },
    { value: "lt", label: "before" },
    { value: "lte", label: "on or before" },
  ],
  boolean: [{ value: "equals", label: "is" }],
  enum: [
    { value: "equals", label: "is" },
    { value: "not", label: "is not" },
  ],
};

export function isOperatorValidForKind(kind: FieldKind, op: string): op is FilterOperator {
  return OPERATORS_BY_KIND[kind].some((o) => o.value === op);
}

export function defaultOperatorForKind(kind: FieldKind): FilterOperator {
  return OPERATORS_BY_KIND[kind][0].value;
}

/** Parses a raw string filter value into what Prisma expects for 'kind'. */
export function parseFilterValue(kind: FieldKind, raw: string): { ok: true; value: any } | { ok: false; error: string } {
  switch (kind) {
    case "string":
    case "enum":
      return { ok: true, value: raw };
    case "boolean":
      if (raw !== "true" && raw !== "false") return { ok: false, error: 'Invalid boolean value: ' + raw };
      return { ok: true, value: raw === "true" };
    case "number": {
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n)) return { ok: false, error: 'Invalid number value: ' + raw };
      return { ok: true, value: n };
    }
    case "datetime": {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return { ok: false, error: 'Invalid date value: ' + raw };
      return { ok: true, value: d };
    }
  }
}

/**
 * Builds the Prisma 'where; fragment for one field/operator/value. 'caseInsensitive' (default
 * true) adds Prisma's 'mode: "insensitive"' for string operators — supported on PostgreSQL and
 * MongoDB, but rejected by Prisma's SQLite connector, so callers must pass 'false' there.
 */
export function buildPrismaFilterCondition(
  fieldName: string,
  kind: FieldKind,
  operator: FilterOperator,
  value: any,
  caseInsensitive = true,
): Record<string, any> {
  if (kind === "string") return { [fieldName]: { [operator]: value, ...(caseInsensitive ? { mode: "insensitive" } : {}) } };
  return { [fieldName]: { [operator]: value } };
}

export function sanitizeInput(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === "" || val === null || val === undefined) continue;
    out[key] = val;
  }
  return out;
}`

export default body
