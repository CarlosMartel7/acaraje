import { code, imp } from "ts-poet";

const sql = imp("sql@kysely");
const ExpressionBuilder = imp("t:ExpressionBuilder@kysely");
const Expression = imp("t:Expression@kysely");
const SqlBool = imp("t:SqlBool@kysely");
const SelectQueryBuilder = imp("t:SelectQueryBuilder@kysely");
const FieldKind = imp("t:FieldKind@@/lib/crud/resolve-filters");
const FieldKindMap = imp("t:FieldKindMap@@/lib/crud/resolve-filters");
const ResolvedFilter = imp("t:ResolvedFilter@@/lib/crud/resolve-filters");
const ResolvedSort = imp("t:ResolvedSort@@/lib/crud/resolve-filters");

// Written to lib/crud/kysely-filters.ts for orm "pure-sql" only: the Kysely adapter for the
// shared rules in lib/crud/resolve-filters.ts. Mirrors prisma-filters.ts — keep them in sync.
const writeKyselyFilters = () => code`
/**
 * Compiles a query resolved by lib/crud/resolve-filters.ts into Kysely 'where' / 'orderBy'
 * clauses for the project's database:
 * - Text matching uses 'ilike' on PostgreSQL and 'like' elsewhere (MySQL's default collations and
 *   SQLite's LIKE are already case-insensitive for ASCII). '%', '_' and '!' typed by the user are
 *   escaped, so they match literally.
 * - SQLite stores booleans as 1/0 and datetimes as text, in either the ISO form the panel writes
 *   or the "YYYY-MM-DD HH:MM:SS" form CURRENT_TIMESTAMP writes. Booleans are bound as 1/0, and
 *   datetimes are compared and ordered through julianday(), which reads both forms.
 */

export type SqlDialect = "postgresql" | "mysql" | "sqlite";

type Eb = ${ExpressionBuilder}<any, any>;
type Condition = ${Expression}<${SqlBool}>;

const LIKE_ESCAPE = "!";

function escapeLike(value: string): string {
  return value.replace(/[!%_]/g, (c) => LIKE_ESCAPE + c);
}

/** 'field' (i)like 'pattern', where 'pattern' was built from escapeLike() pieces. */
function like(field: string, pattern: string, dialect: SqlDialect): Condition {
  const op = dialect === "postgresql" ? "ilike" : "like";
  return ${sql}<${SqlBool}>\`\${${sql}.ref(field)} \${${sql}.raw(op)} \${pattern} escape '\${${sql}.raw(LIKE_ESCAPE)}'\`;
}

function column(field: string, kind: ${FieldKind}, dialect: SqlDialect) {
  return dialect === "sqlite" && kind === "datetime" ? ${sql}\`julianday(\${${sql}.ref(field)})\` : ${sql}.ref(field);
}

function bind(value: any, kind: ${FieldKind}, dialect: SqlDialect) {
  if (dialect !== "sqlite") return value;
  if (kind === "boolean") return value ? 1 : 0;
  if (kind === "datetime") return ${sql}\`julianday(\${(value as Date).toISOString()})\`;
  return value;
}

const COMPARISONS = { equals: "=", not: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=" } as const;

/** Builds the Kysely condition for one resolved filter. */
export function buildKyselyFilterCondition(eb: Eb, filter: ${ResolvedFilter}, dialect: SqlDialect): Condition {
  const { field, kind } = filter;

  if (filter.operator === "range") {
    return eb.and([
      eb(column(field, kind, dialect), ">=", bind(filter.value.gte, kind, dialect)),
      eb(column(field, kind, dialect), "<", bind(filter.value.lt, kind, dialect)),
    ]);
  }

  if (kind === "string") {
    const value = String(filter.value);
    switch (filter.operator) {
      case "contains":
        return like(field, "%" + escapeLike(value) + "%", dialect);
      case "startsWith":
        return like(field, escapeLike(value) + "%", dialect);
      case "endsWith":
        return like(field, "%" + escapeLike(value), dialect);
      case "equals":
        // Case-insensitive equality on PostgreSQL, matching the other string operators there.
        return dialect === "postgresql" ? like(field, escapeLike(value), dialect) : eb(field, "=", value);
    }
  }

  const op = COMPARISONS[filter.operator as keyof typeof COMPARISONS] ?? "=";
  return eb(column(field, kind, dialect), op, bind(filter.value, kind, dialect));
}

/** Matches 'term' as a substring of any of 'searchFields' (the model's string columns). */
export function buildKyselySearch(searchFields: string[], term: string, eb: Eb, dialect: SqlDialect): Condition | null {
  if (!term || searchFields.length === 0) return null;
  return eb.or(searchFields.map((field) => like(field, "%" + escapeLike(term) + "%", dialect)));
}

export interface KyselyListQuery {
  filters: ${ResolvedFilter}[];
  search: string;
  searchFields: string[];
  dialect: SqlDialect;
}

/** The 'where' a list page applies to both its records and its count query. */
export function buildKyselyWhere(eb: Eb, query: KyselyListQuery): Condition {
  const conditions: Condition[] = [];

  const search = buildKyselySearch(query.searchFields, query.search, eb, query.dialect);
  if (search) conditions.push(search);

  for (const f of query.filters) {
    conditions.push(buildKyselyFilterCondition(eb, f, query.dialect));
  }

  return eb.and(conditions);
}

/** Appends the resolved order (sort, then tie-breaker) to a select query. */
export function applyKyselyOrder<QB extends ${SelectQueryBuilder}<any, any, any>>(
  qb: QB,
  orderBy: ${ResolvedSort}[],
  fieldKinds: ${FieldKindMap},
  dialect: SqlDialect,
): QB {
  let ordered: ${SelectQueryBuilder}<any, any, any> = qb;
  for (const s of orderBy) {
    ordered = ordered.orderBy(column(s.field, fieldKinds[s.field], dialect), s.order);
  }
  return ordered as QB;
}
`;

export default writeKyselyFilters;
