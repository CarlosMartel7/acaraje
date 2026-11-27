import { code } from "ts-poet";

const writeLibCrudFilters = () => code`

/**
 * The shared filter/sort rules: classifies field types into filter/sort "kinds", defines which
 * operators are valid for each, and resolves a list request into validated filters and a sort.
 * Pure, no Node or ORM imports — safe to import from API routes, tRPC handlers and client
 * components alike. Compiling the resolved query into a database query is the job of the ORM
 * adapter next to this file (prisma-filters.ts or kysely-filters.ts).
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

/** Parses a raw string filter value into the typed value the adapters compare against. */
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

/** Filterable/sortable field name -> kind, for one model. Anything absent can't be filtered or sorted on. */
export type FieldKindMap = Record<string, FieldKind>;

/** Builds a model's FieldKindMap from its field metadata, keeping only filterable fields. */
export function filterableFieldKinds(fields: Record<string, FieldLike>, enumNames: Set<string> | string[]): FieldKindMap {
  const kinds: FieldKindMap = {};
  for (const [name, field] of Object.entries(fields)) {
    if (isFilterableField(field, enumNames)) kinds[name] = getFieldKind(field.type, enumNames)!;
  }
  return kinds;
}

function kindOf(fieldKinds: FieldKindMap, name: string): FieldKind | undefined {
  return Object.prototype.hasOwnProperty.call(fieldKinds, name) ? fieldKinds[name] : undefined;
}

/** One validated filter, with its value already parsed for the field's kind. */
export interface ResolvedFilter {
  field: string;
  kind: FieldKind;
  operator: FilterOperator;
  value: any;
}

export interface ResolvedSort {
  field: string;
  order: Crud.SortOrder;
}

export interface ListQueryInput {
  filters?: Crud.FilterCondition[];
  sortField?: string;
  sortOrder?: string;
}

export type ListQueryResolution =
  | { ok: true; filters: ResolvedFilter[]; sort: ResolvedSort | null }
  | { ok: false; error: string };

/**
 * Validates a list request against a model's filterable fields. Filters on unknown fields or with
 * an operator the field's kind doesn't support are skipped; a value that doesn't parse for the
 * field's kind, or a sort on a field that isn't sortable, fails the whole request. Without a sort
 * field, 'defaultSort' applies.
 */
export function resolveListQuery(
  input: ListQueryInput,
  fieldKinds: FieldKindMap,
  defaultSort: ResolvedSort | null,
): ListQueryResolution {
  const filters: ResolvedFilter[] = [];
  for (const f of input.filters ?? []) {
    const kind = kindOf(fieldKinds, f.field);
    if (!kind || !isOperatorValidForKind(kind, f.operator)) continue;

    const parsedValue = parseFilterValue(kind, f.value);
    if (!parsedValue.ok) return { ok: false, error: parsedValue.error };

    filters.push({ field: f.field, kind, operator: f.operator, value: parsedValue.value });
  }

  let sort = defaultSort;
  if (input.sortField) {
    if (!kindOf(fieldKinds, input.sortField)) return { ok: false, error: "Sort field is not sortable" };
    sort = { field: input.sortField, order: input.sortOrder === "asc" ? "asc" : "desc" };
  }

  return { ok: true, filters, sort };
}

/** Parses the REST 'filters' query parameter (a JSON array of conditions); '' means no filters. */
export function parseFiltersParam(raw: string): { ok: true; filters: Crud.FilterCondition[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, filters: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("filters must be an array");
    return { ok: true, filters: parsed };
  } catch {
    return { ok: false, error: "Invalid filters parameter: must be a JSON array" };
  }
}

export function sanitizeInput(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === "" || val === null || val === undefined) continue;
    out[key] = val;
  }
  return out;
}`

export default writeLibCrudFilters
