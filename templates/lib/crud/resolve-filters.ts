import { code } from "ts-poet";

/**
 * The per-model field metadata a list endpoint needs, as a TS object literal for the generated
 * route/handler: every field's name, type and flags, plus the enum names those fields use. The
 * generated code classifies it at runtime with the same rules the client applies to
 * /api/schemas, so server and filter bar can't disagree about what is filterable.
 */
export function listMetadataLiteral(schema: PrismaSchema.ParsedSchema, model: PrismaSchema.PrismaModel): string {
  const fields = model.fields.map((f) => ({
    name: f.name,
    type: f.type,
    isList: f.isList,
    isId: f.isId,
    isRelation: f.isRelation,
    ...(f.relationFields && f.relationFields.length > 0 ? { relationFields: f.relationFields } : {}),
    ...(f.pseudoEnumValues && f.pseudoEnumValues.length > 0 ? { pseudoEnumValues: f.pseudoEnumValues } : {}),
  }));
  const enumNames = schema.enums.filter((e) => model.fields.some((f) => f.type === e.name)).map((e) => e.name);
  return JSON.stringify({ fields, enumNames });
}

const writeLibCrudFilters = () => code`

/**
 * The shared filter/sort rules: classifies fields into filter/sort "kinds", defines which
 * operators are valid for each, and resolves a list request into validated filters and an order.
 * Pure, no Node or ORM imports — safe to import from API routes, tRPC handlers and client
 * components alike. Compiling the resolved query into a database query is the job of the ORM
 * adapter next to this file (prisma-filters.ts or kysely-filters.ts).
 */

export type FieldKind = "string" | "number" | "boolean" | "datetime" | "enum";

export type FilterOperator = "contains" | "startsWith" | "endsWith" | "equals" | "not" | "gt" | "gte" | "lt" | "lte";

/** What the rules need to know about a field — a subset of both Schema.Field and PrismaSchema.PrismaField. */
export interface FieldLike {
  name: string;
  type: string;
  isList: boolean;
  isId?: boolean;
  isRelation?: boolean;
  relationFields?: string[];
  pseudoEnumValues?: string[];
}

// Prisma scalar type names.
const PRISMA_KINDS: Record<string, FieldKind> = {
  String: "string",
  Int: "number",
  Float: "number",
  Decimal: "number",
  BigInt: "number",
  Boolean: "boolean",
  DateTime: "datetime",
};

// Raw SQL column types (as sql-parser.ts reports them for PostgreSQL, MySQL and SQLite), compared
// upper-cased with any "(...)" size/precision argument stripped.
const SQL_KINDS: Record<string, FieldKind> = {};
for (const t of ["TEXT", "VARCHAR", "CHAR", "CHARACTER", "NVARCHAR", "NCHAR", "CLOB", "UUID", "CITEXT"]) SQL_KINDS[t] = "string";
for (const t of [
  "INT", "INTEGER", "SMALLINT", "MEDIUMINT", "BIGINT", "TINYINT", "SERIAL", "BIGSERIAL", "SMALLSERIAL",
  "FLOAT", "DOUBLE", "REAL", "DECIMAL", "NUMERIC", "MONEY",
]) SQL_KINDS[t] = "number";
for (const t of ["BOOLEAN", "BOOL"]) SQL_KINDS[t] = "boolean";
for (const t of ["DATETIME", "TIMESTAMP", "TIMESTAMPTZ", "DATE", "TIME", "TIMETZ"]) SQL_KINDS[t] = "datetime";

function baseSqlType(type: string): string {
  return type.replace(/\\(.*\\)/, "").trim().toUpperCase();
}

/**
 * A field's filter/sort kind, or null when it can't be filtered or sorted on (lists, Prisma
 * relation fields, JSON/binary columns, ...). Understands both Prisma type names and raw SQL
 * column types. In pure-SQL schemas a foreign-key column is its own relation field
 * ('relationFields' names itself) and is filtered by its column type.
 */
export function getFieldKind(field: FieldLike, enumNames: Set<string> | string[]): FieldKind | null {
  if (field.isList) return null;
  if (field.isRelation && !(field.relationFields ?? []).includes(field.name)) return null;
  if (field.pseudoEnumValues && field.pseudoEnumValues.length > 0) return "enum";
  const enumSet = enumNames instanceof Set ? enumNames : new Set(enumNames);
  if (enumSet.has(field.type)) return "enum";
  if (Object.prototype.hasOwnProperty.call(PRISMA_KINDS, field.type)) return PRISMA_KINDS[field.type];
  const base = baseSqlType(field.type);
  return Object.prototype.hasOwnProperty.call(SQL_KINDS, base) ? SQL_KINDS[base] : null;
}

export function isFilterableField(field: FieldLike, enumNames: Set<string> | string[]): boolean {
  return getFieldKind(field, enumNames) !== null;
}

/** The values an enum-kind field accepts: its '@enum' comment values, or its enum type's values. */
export function enumValuesFor(field: FieldLike, enums: { name: string; values: string[] }[]): string[] {
  if (field.pseudoEnumValues && field.pseudoEnumValues.length > 0) return field.pseudoEnumValues;
  return enums.find((e) => e.name === field.type)?.values ?? [];
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

const MINUTE_MS = 60_000;

/**
 * Parses a raw string filter value into the typed value the adapters compare against. Datetime
 * filters work at the minute precision of the filter bar's input: the value is truncated to its
 * minute, and the operators treat that minute as a whole (see resolveListQuery).
 */
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
      if (raw.trim() === "" || !Number.isFinite(n)) return { ok: false, error: 'Invalid number value: ' + raw };
      return { ok: true, value: n };
    }
    case "datetime": {
      const d = new Date(raw);
      if (raw.trim() === "" || Number.isNaN(d.getTime())) return { ok: false, error: 'Invalid date value: ' + raw };
      return { ok: true, value: new Date(Math.floor(d.getTime() / MINUTE_MS) * MINUTE_MS) };
    }
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Datetime filters travel as UTC instants (ISO strings), so the server never has to guess the
 * browser's timezone. These convert to and from the filter bar's 'datetime-local' input, which
 * holds the user's local wall-clock time ("YYYY-MM-DDTHH:mm").
 */
export function toFilterDateTime(localInput: string): string {
  if (!localInput) return "";
  const d = new Date(localInput);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function fromFilterDateTime(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/** Filterable/sortable field name -> kind, for one model. Anything absent can't be filtered or sorted on. */
export type FieldKindMap = Record<string, FieldKind>;

/** How one model's list endpoint filters, searches and orders, derived from its field metadata. */
export interface ListConfig {
  fieldKinds: FieldKindMap;
  /** String fields the free-text search matches against. */
  searchFields: string[];
  /** Order when the request names no sort field. */
  defaultSort: ResolvedSort | null;
  /** The primary key, ordered last so rows with equal sort values keep a stable page order. */
  tieBreaker: string | null;
}

export function listConfig(meta: { fields: FieldLike[]; enumNames: string[] }): ListConfig {
  const fieldKinds: FieldKindMap = {};
  for (const field of meta.fields) {
    const kind = getFieldKind(field, meta.enumNames);
    if (kind) fieldKinds[field.name] = kind;
  }

  const ids = meta.fields.filter((f) => f.isId);
  const tieBreaker = ids.length === 1 && fieldKinds[ids[0].name] ? ids[0].name : null;

  return {
    fieldKinds,
    searchFields: Object.keys(fieldKinds).filter((name) => fieldKinds[name] === "string"),
    defaultSort: fieldKinds.createdAt === "datetime" ? { field: "createdAt", order: "desc" } : null,
    tieBreaker,
  };
}

function kindOf(fieldKinds: FieldKindMap, name: string): FieldKind | undefined {
  return Object.prototype.hasOwnProperty.call(fieldKinds, name) ? fieldKinds[name] : undefined;
}

/**
 * One validated filter, with its value parsed for the field's kind. Datetime operators are
 * normalized to whole-minute bounds; "range" (from "on") carries '{ gte, lt }'.
 */
export type ResolvedFilter =
  | { field: string; kind: FieldKind; operator: FilterOperator; value: any }
  | { field: string; kind: "datetime"; operator: "range"; value: { gte: Date; lt: Date } };

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
  | { ok: true; filters: ResolvedFilter[]; orderBy: ResolvedSort[] }
  | { ok: false; error: string };

function resolveDateTimeFilter(field: string, operator: FilterOperator, minute: Date): ResolvedFilter {
  const nextMinute = new Date(minute.getTime() + MINUTE_MS);
  switch (operator) {
    case "equals":
      return { field, kind: "datetime", operator: "range", value: { gte: minute, lt: nextMinute } };
    case "gt":
      return { field, kind: "datetime", operator: "gte", value: nextMinute };
    case "lte":
      return { field, kind: "datetime", operator: "lt", value: nextMinute };
    default:
      return { field, kind: "datetime", operator, value: minute };
  }
}

/**
 * Validates a list request against a model's list config. Any filter on a field that can't be
 * filtered, with an operator its kind doesn't support, or with a value that doesn't parse fails
 * the whole request — silently dropping it would show more rows than were asked for. The order
 * is the requested sort (or the default), then the tie-breaker in the same direction.
 */
export function resolveListQuery(input: ListQueryInput, config: ListConfig): ListQueryResolution {
  const filters: ResolvedFilter[] = [];
  for (const f of input.filters ?? []) {
    const kind = kindOf(config.fieldKinds, f.field);
    if (!kind) return { ok: false, error: 'Field "' + f.field + '" cannot be filtered' };
    if (!isOperatorValidForKind(kind, f.operator)) {
      return { ok: false, error: 'Operator "' + f.operator + '" is not valid for field "' + f.field + '"' };
    }

    const parsedValue = parseFilterValue(kind, f.value);
    if (!parsedValue.ok) return { ok: false, error: parsedValue.error + ' (field "' + f.field + '")' };

    filters.push(
      kind === "datetime"
        ? resolveDateTimeFilter(f.field, f.operator, parsedValue.value)
        : { field: f.field, kind, operator: f.operator, value: parsedValue.value },
    );
  }

  let sort = config.defaultSort;
  if (input.sortField) {
    if (!kindOf(config.fieldKinds, input.sortField)) {
      return { ok: false, error: 'Field "' + input.sortField + '" cannot be sorted' };
    }
    sort = { field: input.sortField, order: input.sortOrder === "asc" ? "asc" : "desc" };
  }

  const orderBy: ResolvedSort[] = sort ? [sort] : [];
  if (config.tieBreaker && sort?.field !== config.tieBreaker) {
    orderBy.push({ field: config.tieBreaker, order: sort?.order ?? "desc" });
  }

  return { ok: true, filters, orderBy };
}

/** Parses the REST 'filters' query parameter (a JSON array of conditions); '' means no filters. */
export function parseFiltersParam(raw: string): { ok: true; filters: Crud.FilterCondition[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, filters: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const isCondition = (c: any) =>
    !!c && typeof c.field === "string" && typeof c.operator === "string" && typeof c.value === "string";
  if (!Array.isArray(parsed) || !parsed.every(isCondition)) {
    return { ok: false, error: "Invalid filters parameter: must be a JSON array of { field, operator, value } strings" };
  }
  return { ok: true, filters: parsed };
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
