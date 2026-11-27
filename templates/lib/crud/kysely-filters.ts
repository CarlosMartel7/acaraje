import { code, imp } from "ts-poet";

const sql = imp("sql@kysely");
const ExpressionBuilder = imp("t:ExpressionBuilder@kysely");
const Expression = imp("t:Expression@kysely");
const SqlBool = imp("t:SqlBool@kysely");
const SelectQueryBuilder = imp("t:SelectQueryBuilder@kysely");
const FieldKind = imp("t:FieldKind@@/lib/crud/resolve-filters");
const FieldKindMap = imp("t:FieldKindMap@@/lib/crud/resolve-filters");
const ResolvedFilter = imp("t:ResolvedFilter@@/lib/crud/resolve-filters");
const ResolvedGroup = imp("t:ResolvedGroup@@/lib/crud/resolve-filters");
const ResolvedNode = imp("t:ResolvedNode@@/lib/crud/resolve-filters");
const ResolvedRelation = imp("t:ResolvedRelation@@/lib/crud/resolve-filters");
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
 * - Relation filters become correlated EXISTS subqueries over the related table, aliased r1, r2,
 *   ... by depth so a table can be joined to itself; columns inside them are qualified by alias.
 */

export type SqlDialect = "postgresql" | "mysql" | "sqlite";

type Eb = ${ExpressionBuilder}<any, any>;
type Condition = ${Expression}<${SqlBool}>;

const LIKE_ESCAPE = "!";

function escapeLike(value: string): string {
  return value.replace(/[!%_]/g, (c) => LIKE_ESCAPE + c);
}

/** Where column names resolve: the list's own table (unqualified) or a relation subquery's alias. */
interface Scope {
  table: string;
  alias: string | null;
  depth: number;
}

function ref(scope: Scope, field: string) {
  return ${sql}.ref(scope.alias ? scope.alias + "." + field : field);
}

/** 'field' (i)like 'pattern', where 'pattern' was built from escapeLike() pieces. */
function like(scope: Scope, field: string, pattern: string, dialect: SqlDialect): Condition {
  const op = dialect === "postgresql" ? "ilike" : "like";
  return ${sql}<${SqlBool}>\`\${ref(scope, field)} \${${sql}.raw(op)} \${pattern} escape '\${${sql}.raw(LIKE_ESCAPE)}'\`;
}

function column(scope: Scope, field: string, kind: ${FieldKind}, dialect: SqlDialect) {
  return dialect === "sqlite" && kind === "datetime" ? ${sql}\`julianday(\${ref(scope, field)})\` : ref(scope, field);
}

function bind(value: any, kind: ${FieldKind}, dialect: SqlDialect) {
  if (dialect !== "sqlite") return value;
  if (kind === "boolean") return value ? 1 : 0;
  if (kind === "datetime") return ${sql}\`julianday(\${(value as Date).toISOString()})\`;
  return value;
}

const COMPARISONS = { equals: "=", not: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=" } as const;

function filterCondition(eb: Eb, filter: ${ResolvedFilter}, dialect: SqlDialect, scope: Scope): Condition {
  const { field, kind } = filter;

  if (filter.operator === "range") {
    return eb.and([
      eb(column(scope, field, kind, dialect), ">=", bind(filter.value.gte, kind, dialect)),
      eb(column(scope, field, kind, dialect), "<", bind(filter.value.lt, kind, dialect)),
    ]);
  }

  if (kind === "string") {
    const value = String(filter.value);
    switch (filter.operator) {
      case "contains":
        return like(scope, field, "%" + escapeLike(value) + "%", dialect);
      case "startsWith":
        return like(scope, field, escapeLike(value) + "%", dialect);
      case "endsWith":
        return like(scope, field, "%" + escapeLike(value), dialect);
      case "equals":
        // Case-insensitive equality on PostgreSQL, matching the other string operators there.
        return dialect === "postgresql" ? like(scope, field, escapeLike(value), dialect) : eb(ref(scope, field), "=", value);
    }
  }

  const op = COMPARISONS[filter.operator as keyof typeof COMPARISONS] ?? "=";
  return eb(column(scope, field, kind, dialect), op, bind(filter.value, kind, dialect));
}

function relationCondition(eb: Eb, node: ${ResolvedRelation}, dialect: SqlDialect, scope: Scope): Condition {
  const { name, target, localColumn, targetColumn } = node.relation;
  if (!localColumn || !targetColumn) throw new Error('Relation "' + name + '" has no join columns');

  const inner: Scope = { table: target, alias: "r" + (scope.depth + 1), depth: scope.depth + 1 };
  const link = eb(${sql}.ref(inner.alias + "." + targetColumn), "=", ${sql}.ref((scope.alias ?? scope.table) + "." + localColumn));
  const related = (condition: Condition | null) =>
    eb.exists(
      eb
        .selectFrom(target + " as " + inner.alias)
        .select(${sql}.lit(1).as("one"))
        .where(condition ? eb.and([link, condition]) : link),
    );

  const where = node.where ? buildNode(eb, node.where, dialect, inner) : null;
  switch (node.mode) {
    case "some":
      return related(where);
    case "none":
      return eb.not(related(where));
    case "every":
      // No related record fails the condition.
      return where ? eb.not(related(eb.not(where))) : eb.and([]);
  }
}

function buildNode(eb: Eb, node: ${ResolvedNode}, dialect: SqlDialect, scope: Scope): Condition {
  if (node.type === "condition") return filterCondition(eb, node.filter, dialect, scope);
  if (node.type === "relation") return relationCondition(eb, node, dialect, scope);

  const children = node.children.map((child) => buildNode(eb, child, dialect, scope));
  // An empty group matches everything, whichever its combinator.
  const combined = children.length === 0 ? eb.and([]) : node.combinator === "and" ? eb.and(children) : eb.or(children);
  return node.not ? eb.not(combined) : combined;
}

/** Compiles a resolved filter tree into a Kysely condition on 'table'. */
export function buildKyselyFilter(eb: Eb, node: ${ResolvedNode}, table: string, dialect: SqlDialect): Condition {
  return buildNode(eb, node, dialect, { table, alias: null, depth: 0 });
}

/** Matches 'term' as a substring of any of 'searchFields' (the model's string columns). */
export function buildKyselySearch(searchFields: string[], term: string, eb: Eb, table: string, dialect: SqlDialect): Condition | null {
  if (!term || searchFields.length === 0) return null;
  const scope: Scope = { table, alias: null, depth: 0 };
  return eb.or(searchFields.map((field) => like(scope, field, "%" + escapeLike(term) + "%", dialect)));
}

export interface KyselyListQuery {
  table: string;
  filter: ${ResolvedGroup} | null;
  search: string;
  searchFields: string[];
  dialect: SqlDialect;
}

/** The 'where' a list page applies to both its records and its count query. */
export function buildKyselyWhere(eb: Eb, query: KyselyListQuery): Condition {
  const conditions: Condition[] = [];

  const search = buildKyselySearch(query.searchFields, query.search, eb, query.table, query.dialect);
  if (search) conditions.push(search);
  if (query.filter && query.filter.combinator === "and" && !query.filter.not) {
    // A top-level AND group's children join the search condition directly.
    for (const child of query.filter.children) conditions.push(buildKyselyFilter(eb, child, query.table, query.dialect));
  } else if (query.filter) {
    conditions.push(buildKyselyFilter(eb, query.filter, query.table, query.dialect));
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
    ordered = ordered.orderBy(column({ table: "", alias: null, depth: 0 }, s.field, fieldKinds[s.field], dialect), s.order);
  }
  return ordered as QB;
}
`;

export default writeKyselyFilters;
