import { code } from "ts-poet";

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

/**
 * A relation filters can follow from a model. In Prisma schemas it is a relation field; in
 * pure-SQL schemas it is a foreign key, seen from either end: from the referencing table it is
 * named after its column and is to-one, from the referenced table it is named
 * "<Table>.<column>" and is a collection unless the column is unique. SQL relations carry the
 * columns that join them: related.<targetColumn> = this.<localColumn>.
 */
export interface RelationMeta {
  name: string;
  label: string;
  target: string;
  many: boolean;
  /** To-one only: whether every record has one (Prisma can't test a required relation for null). */
  required: boolean;
  localColumn?: string;
  targetColumn?: string;
}

/** How one model's list endpoint filters, searches and orders. */
export interface ModelFilterConfig {
  fieldKinds: FieldKindMap;
  /** Accepted values of the model's enum-kind fields. */
  enumValues: Record<string, string[]>;
  relations: Record<string, RelationMeta>;
  /** String fields the free-text search matches against. */
  searchFields: string[];
  /** Order when the request names no sort field. */
  defaultSort: ResolvedSort | null;
  /** The primary key, ordered last so rows with equal sort values keep a stable page order. */
  tieBreaker: string | null;
}

export interface FilterSchema {
  models: Record<string, ModelFilterConfig>;
}

interface SchemaLike {
  models: { name: string; fields: (FieldLike & { isRequired?: boolean; isUnique?: boolean })[] }[];
  enums: { name: string; values: string[] }[];
  relations?: { from: string; fromField: string; to: string; type: string }[];
}

function isSqlForeignKey(field: FieldLike): boolean {
  return !!field.isRelation && (field.relationFields ?? []).includes(field.name);
}

/**
 * Derives every model's filter metadata from a parsed schema. The server runs it on
 * lib/parsed-schema.ts and the filter bar on /api/schemas — the same data — so both agree on
 * what can be filtered, sorted and followed.
 */
export function buildFilterSchema(schema: SchemaLike): FilterSchema {
  const enumNames = schema.enums.map((e) => e.name);
  const modelsByName = new Map(schema.models.map((m) => [m.name, m]));
  const primaryKey = (modelName: string) => {
    const ids = modelsByName.get(modelName)?.fields.filter((f) => f.isId) ?? [];
    return ids.length === 1 ? ids[0].name : null;
  };

  const models: Record<string, ModelFilterConfig> = {};
  for (const model of schema.models) {
    const fieldKinds: FieldKindMap = {};
    const enumValues: Record<string, string[]> = {};
    for (const field of model.fields) {
      const kind = getFieldKind(field, enumNames);
      if (!kind) continue;
      fieldKinds[field.name] = kind;
      if (kind === "enum") enumValues[field.name] = enumValuesFor(field, schema.enums);
    }

    const relations: Record<string, RelationMeta> = {};
    for (const field of model.fields) {
      if (!field.isRelation || isSqlForeignKey(field) || !modelsByName.has(field.type)) continue;
      relations[field.name] = {
        name: field.name,
        label: field.name,
        target: field.type,
        many: field.isList,
        required: !field.isList && !!field.isRequired,
      };
    }
    for (const rel of schema.relations ?? []) {
      const fkField = modelsByName.get(rel.from)?.fields.find((f) => f.name === rel.fromField);
      if (!fkField || !isSqlForeignKey(fkField) || !modelsByName.has(rel.to)) continue;
      const targetKey = primaryKey(rel.to);
      if (rel.from === model.name && targetKey) {
        relations[rel.fromField] = {
          name: rel.fromField,
          label: rel.fromField + " → " + rel.to,
          target: rel.to,
          many: false,
          required: !!fkField.isRequired,
          localColumn: rel.fromField,
          targetColumn: targetKey,
        };
      }
      const localKey = primaryKey(model.name);
      if (rel.to === model.name && localKey) {
        const name = rel.from + "." + rel.fromField;
        relations[name] = {
          name,
          label: rel.from + " (" + rel.fromField + ")",
          target: rel.from,
          many: !(fkField.isUnique || fkField.isId),
          required: false,
          localColumn: localKey,
          targetColumn: rel.fromField,
        };
      }
    }

    const ids = model.fields.filter((f) => f.isId);
    models[model.name] = {
      fieldKinds,
      enumValues,
      relations,
      searchFields: Object.keys(fieldKinds).filter((name) => fieldKinds[name] === "string"),
      defaultSort: fieldKinds.createdAt === "datetime" ? { field: "createdAt", order: "desc" } : null,
      tieBreaker: ids.length === 1 && fieldKinds[ids[0].name] ? ids[0].name : null,
    };
  }

  return { models };
}

/** A model's config, by exact name or case-insensitively (route segments may be lower-cased). */
export function findModelConfig(schema: FilterSchema, model: string): { name: string; config: ModelFilterConfig } | null {
  if (Object.prototype.hasOwnProperty.call(schema.models, model)) return { name: model, config: schema.models[model] };
  const name = Object.keys(schema.models).find((m) => m.toLowerCase() === model.toLowerCase());
  return name ? { name, config: schema.models[name] } : null;
}

function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * One validated filter, with its value parsed for the field's kind. Datetime operators are
 * normalized to whole-minute bounds; "range" (from "on") carries '{ gte, lt }'.
 */
export type ResolvedFilter =
  | { field: string; kind: FieldKind; operator: FilterOperator; value: any }
  | { field: string; kind: "datetime"; operator: "range"; value: { gte: Date; lt: Date } };

export interface ResolvedGroup {
  type: "group";
  combinator: "and" | "or";
  not: boolean;
  children: ResolvedNode[];
}

export interface ResolvedRelation {
  type: "relation";
  relation: RelationMeta;
  mode: "some" | "every" | "none";
  /** Conditions on the related model; null tests the relation itself (empty / not empty). */
  where: ResolvedGroup | null;
}

export type ResolvedNode = { type: "condition"; filter: ResolvedFilter } | ResolvedGroup | ResolvedRelation;

export interface ResolvedSort {
  field: string;
  order: Crud.SortOrder;
}

export interface ListQueryInput {
  filters?: unknown;
  sortField?: string;
  sortOrder?: string;
}

export type ListQueryResolution =
  | { ok: true; filter: ResolvedGroup | null; orderBy: ResolvedSort[] }
  | { ok: false; error: string };

/** How deep groups and relations may nest, and how many nodes a tree may hold. */
export const MAX_FILTER_DEPTH = 5;
export const MAX_FILTER_NODES = 50;

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

class FilterError extends Error {}

function resolveCondition(node: any, config: ModelFilterConfig, model: string): ResolvedNode {
  if (typeof node.field !== "string" || typeof node.operator !== "string" || typeof node.value !== "string") {
    throw new FilterError("Invalid filter condition: expected { field, operator, value } strings");
  }
  const kind = own(config.fieldKinds, node.field);
  if (!kind) throw new FilterError('Field "' + node.field + '" of ' + model + " cannot be filtered");
  if (!isOperatorValidForKind(kind, node.operator)) {
    throw new FilterError('Operator "' + node.operator + '" is not valid for field "' + node.field + '"');
  }
  const parsed = parseFilterValue(kind, node.value);
  if (!parsed.ok) throw new FilterError(parsed.error + ' (field "' + node.field + '")');
  return {
    type: "condition",
    filter: kind === "datetime"
      ? resolveDateTimeFilter(node.field, node.operator, parsed.value)
      : { field: node.field, kind, operator: node.operator, value: parsed.value },
  };
}

/**
 * Validates and resolves a filter tree for 'model'. Every part must be valid — an unknown field,
 * an operator the field's kind doesn't support, a value that doesn't parse, an unknown relation
 * or a malformed node fails the whole request, since silently dropping it would show more rows
 * than were asked for. Empty groups match everything.
 */
export function resolveFilterTree(input: unknown, schema: FilterSchema, model: string): ResolvedGroup | null {
  if (input === undefined || input === null) return null;
  let nodes = 0;

  const resolveGroup = (group: any, modelName: string, depth: number): ResolvedGroup => {
    if (depth > MAX_FILTER_DEPTH) throw new FilterError("Filters are nested more than " + MAX_FILTER_DEPTH + " levels deep");
    if (!group || group.type !== "group" || (group.combinator !== "and" && group.combinator !== "or") || !Array.isArray(group.children)) {
      throw new FilterError('Invalid filter group: expected { type: "group", combinator: "and" | "or", children: [...] }');
    }
    const config = schema.models[modelName];
    return {
      type: "group",
      combinator: group.combinator,
      not: group.not === true,
      children: group.children.map((child: any): ResolvedNode => {
        if (++nodes > MAX_FILTER_NODES) throw new FilterError("Too many filters (at most " + MAX_FILTER_NODES + ")");
        if (!child || typeof child !== "object") throw new FilterError("Invalid filter: expected an object");
        if (child.type === "group") return resolveGroup(child, modelName, depth + 1);
        if (child.type === "relation") {
          const relation = typeof child.relation === "string" ? own(config.relations, child.relation) : undefined;
          if (!relation) throw new FilterError('Relation "' + String(child.relation) + '" of ' + modelName + " cannot be filtered");
          if (child.mode !== "some" && child.mode !== "every" && child.mode !== "none") {
            throw new FilterError('Invalid relation mode "' + String(child.mode) + '": expected "some", "every" or "none"');
          }
          const where = child.where === undefined ? null : resolveGroup(child.where, relation.target, depth + 1);
          return { type: "relation", relation, mode: child.mode, where: where && where.children.length > 0 ? where : null };
        }
        if (child.type !== undefined && child.type !== "condition") throw new FilterError('Unknown filter type "' + String(child.type) + '"');
        return resolveCondition(child, config, modelName);
      }),
    };
  };

  // A flat array is the pre-group URL format: every condition AND-ed.
  const root = Array.isArray(input) ? { type: "group", combinator: "and", children: input } : input;
  return resolveGroup(root, model, 0);
}

/**
 * Validates a list request for 'model': its filter tree (see resolveFilterTree) and its order —
 * the requested sort (or the default), then the tie-breaker in the same direction.
 */
export function resolveListQuery(input: ListQueryInput, schema: FilterSchema, model: string): ListQueryResolution {
  const config = own(schema.models, model);
  if (!config) return { ok: false, error: "Unknown model " + model };

  let filter: ResolvedGroup | null;
  try {
    filter = resolveFilterTree(input.filters, schema, model);
  } catch (err) {
    if (err instanceof FilterError) return { ok: false, error: err.message };
    throw err;
  }

  let sort = config.defaultSort;
  if (input.sortField) {
    if (!own(config.fieldKinds, input.sortField)) {
      return { ok: false, error: 'Field "' + input.sortField + '" cannot be sorted' };
    }
    sort = { field: input.sortField, order: input.sortOrder === "asc" ? "asc" : "desc" };
  }

  const orderBy: ResolvedSort[] = sort ? [sort] : [];
  if (config.tieBreaker && sort?.field !== config.tieBreaker) {
    orderBy.push({ field: config.tieBreaker, order: sort?.order ?? "desc" });
  }

  return { ok: true, filter: filter && filter.children.length > 0 ? filter : null, orderBy };
}

/** An empty filter tree: what the filter bar starts from. */
export function emptyFilterGroup(): Crud.FilterGroup {
  return { type: "group", combinator: "and", children: [] };
}

/** Normalizes what a URL or caller holds — a tree, a pre-group flat array, or nothing — into a tree. */
export function toFilterGroup(input: unknown): Crud.FilterGroup {
  if (Array.isArray(input)) return { type: "group", combinator: "and", children: input };
  if (input && typeof input === "object" && (input as any).type === "group" && Array.isArray((input as any).children)) {
    return input as Crud.FilterGroup;
  }
  return emptyFilterGroup();
}

/**
 * Drops conditions the user hasn't given a value yet (and relations/groups left with nothing
 * but those), so a half-built filter doesn't fail the list request while it's being edited.
 * Returns null when nothing is left to send.
 */
export function completeFilters(group: Crud.FilterGroup): Crud.FilterGroup | null {
  const prune = (g: Crud.FilterGroup): Crud.FilterGroup => ({
    ...g,
    children: g.children.flatMap((child): Crud.FilterNode[] => {
      if (child.type === "group") return [prune(child)];
      if (child.type === "relation") return [child.where ? { ...child, where: prune(child.where) } : child];
      return child.value === "" ? [] : [child];
    }),
  });
  const pruned = prune(group);
  return pruned.children.length > 0 ? pruned : null;
}

/** Parses the REST 'filters' query parameter (a JSON filter tree, or a pre-group flat array); '' means none. */
export function parseFiltersParam(raw: string): { ok: true; filters: unknown } | { ok: false; error: string } {
  if (!raw) return { ok: true, filters: undefined };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return { ok: true, filters: parsed };
  } catch {
    return { ok: false, error: "Invalid filters parameter: must be a JSON filter group or array of conditions" };
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
