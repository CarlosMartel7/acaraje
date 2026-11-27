import { code, imp } from "ts-poet";

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

/** Builds the Prisma 'where' fragment for one resolved filter. Prisma escapes LIKE wildcards itself. */
export function buildPrismaFilterCondition(filter: ${ResolvedFilter}, caseInsensitive = true): Record<string, any> {
  if (filter.operator === "range") return { [filter.field]: { gte: filter.value.gte, lt: filter.value.lt } };
  const mode = filter.kind === "string" && caseInsensitive ? { mode: "insensitive" } : {};
  return { [filter.field]: { [filter.operator]: filter.value, ...mode } };
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
  orderBy: ${ResolvedSort}[];
  search: string;
  searchFields: string[];
  caseInsensitive: boolean;
}

/** The 'where' and 'orderBy' a list page passes to both 'findMany' and 'count'. */
export function buildPrismaListArgs(query: PrismaListQuery): {
  where: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">[];
} {
  const conditions: Record<string, any>[] = [];

  const search = buildPrismaSearch(query.searchFields, query.search, query.caseInsensitive);
  if (search) conditions.push(search);

  for (const f of query.filters) {
    conditions.push(buildPrismaFilterCondition(f, query.caseInsensitive));
  }

  return {
    where: conditions.length > 0 ? { AND: conditions } : {},
    ...(query.orderBy.length > 0 ? { orderBy: query.orderBy.map((s) => ({ [s.field]: s.order })) } : {}),
  };
}
`;

export default writePrismaFilters;
