import { code, imp } from "ts-poet";

const ExpressionBuilder = imp("t:ExpressionBuilder@kysely");
const Expression = imp("t:Expression@kysely");
const SqlBool = imp("t:SqlBool@kysely");
const FieldKind = imp("t:FieldKind@@/lib/crud/resolve-filters");
const FilterOperator = imp("t:FilterOperator@@/lib/crud/resolve-filters");
const ResolvedFilter = imp("t:ResolvedFilter@@/lib/crud/resolve-filters");

// Written to lib/crud/kysely-filters.ts for orm "pure-sql" only: the Kysely adapter for the
// shared rules in lib/crud/resolve-filters.ts. Mirrors prisma-filters.ts — keep them in sync.
const writeKyselyFilters = () => code`
/**
 * Compiles a query resolved by lib/crud/resolve-filters.ts into a Kysely 'where' expression, for
 * use inside a '.where((eb) => ...)' callback. 'caseInsensitive' switches string comparisons to
 * 'ilike', which only PostgreSQL understands — MySQL and SQLite callers pass 'false' and get 'like'.
 */

type Eb = ${ExpressionBuilder}<any, any>;

/** Builds the Kysely expression for one field/operator/value. */
export function buildKyselyFilterCondition(
  eb: Eb,
  fieldName: string,
  kind: ${FieldKind},
  operator: ${FilterOperator},
  value: any,
  caseInsensitive = true,
): ${Expression}<${SqlBool}> {
  if (kind === "string") {
    const likeOp = caseInsensitive ? "ilike" : "like";
    switch (operator) {
      case "contains":
        return eb(fieldName, likeOp, "%" + value + "%");
      case "startsWith":
        return eb(fieldName, likeOp, value + "%");
      case "endsWith":
        return eb(fieldName, likeOp, "%" + value);
      case "equals":
        return eb(fieldName, caseInsensitive ? "ilike" : "=", value);
      default:
        return eb(fieldName, "=", value);
    }
  }

  switch (operator) {
    case "not":
      return eb(fieldName, "!=", value);
    case "gt":
      return eb(fieldName, ">", value);
    case "gte":
      return eb(fieldName, ">=", value);
    case "lt":
      return eb(fieldName, "<", value);
    case "lte":
      return eb(fieldName, "<=", value);
    default:
      return eb(fieldName, "=", value);
  }
}

/** Matches 'term' as a substring of any of 'searchFields' (the model's string columns). */
export function buildKyselySearch(eb: Eb, searchFields: string[], term: string, caseInsensitive: boolean): ${Expression}<${SqlBool}> | null {
  if (!term || searchFields.length === 0) return null;
  const likeOp = caseInsensitive ? "ilike" : "like";
  return eb.or(searchFields.map((field) => eb(field, likeOp, "%" + term + "%")));
}

export interface KyselyListQuery {
  filters: ${ResolvedFilter}[];
  search: string;
  searchFields: string[];
  caseInsensitive: boolean;
}

/** The 'where' a list page applies to both its records and its count query. */
export function buildKyselyWhere(eb: Eb, query: KyselyListQuery): ${Expression}<${SqlBool}> {
  const conditions: ${Expression}<${SqlBool}>[] = [];

  const search = buildKyselySearch(eb, query.searchFields, query.search, query.caseInsensitive);
  if (search) conditions.push(search);

  for (const f of query.filters) {
    conditions.push(buildKyselyFilterCondition(eb, f.field, f.kind, f.operator, f.value, query.caseInsensitive));
  }

  return eb.and(conditions);
}
`;

export default writeKyselyFilters;
