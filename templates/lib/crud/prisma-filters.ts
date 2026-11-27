import { code, imp } from "ts-poet";

const FieldKind = imp("t:FieldKind@@/lib/crud/resolve-filters");
const FilterOperator = imp("t:FilterOperator@@/lib/crud/resolve-filters");
const ResolvedFilter = imp("t:ResolvedFilter@@/lib/crud/resolve-filters");
const ResolvedSort = imp("t:ResolvedSort@@/lib/crud/resolve-filters");

// Written to lib/crud/prisma-filters.ts for orm "prisma" only: the Prisma adapter for the
// shared rules in lib/crud/resolve-filters.ts. Mirrors kysely-filters.ts — keep them in sync.
const writePrismaFilters = () => code`
/**
 * Compiles a query resolved by lib/crud/resolve-filters.ts into Prisma 'findMany' arguments.
 * 'caseInsensitive' adds Prisma's 'mode: "insensitive"' to string comparisons — supported on
 * PostgreSQL and MongoDB, but rejected by Prisma's SQLite connector, so callers pass 'false' there.
 */

/** Builds the Prisma 'where' fragment for one field/operator/value. */
export function buildPrismaFilterCondition(
  fieldName: string,
  kind: ${FieldKind},
  operator: ${FilterOperator},
  value: any,
  caseInsensitive = true,
): Record<string, any> {
  if (kind === "string") return { [fieldName]: { [operator]: value, ...(caseInsensitive ? { mode: "insensitive" } : {}) } };
  return { [fieldName]: { [operator]: value } };
}

/** Matches 'term' as a substring of any of 'searchFields' (the model's string fields). */
export function buildPrismaSearch(searchFields: string[], term: string, caseInsensitive: boolean): Record<string, any> | null {
  if (!term || searchFields.length === 0) return null;
  return {
    OR: searchFields.map((field) => ({ [field]: { contains: term, ...(caseInsensitive ? { mode: "insensitive" } : {}) } })),
  };
}

export interface PrismaListQuery {
  filters: ${ResolvedFilter}[];
  sort: ${ResolvedSort} | null;
  search: string;
  searchFields: string[];
  caseInsensitive: boolean;
}

/** The 'where' and 'orderBy' a list page passes to both 'findMany' and 'count'. */
export function buildPrismaListArgs(query: PrismaListQuery): {
  where: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">;
} {
  const conditions: Record<string, any>[] = [];

  const search = buildPrismaSearch(query.searchFields, query.search, query.caseInsensitive);
  if (search) conditions.push(search);

  for (const f of query.filters) {
    conditions.push(buildPrismaFilterCondition(f.field, f.kind, f.operator, f.value, query.caseInsensitive));
  }

  return {
    where: conditions.length > 0 ? { AND: conditions } : {},
    ...(query.sort ? { orderBy: { [query.sort.field]: query.sort.order } } : {}),
  };
}
`;

export default writePrismaFilters;
