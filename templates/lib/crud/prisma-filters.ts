import { code, imp } from "ts-poet";

const ResolvedFilter = imp("t:ResolvedFilter@@/lib/crud/resolve-filters");
const ResolvedGroup = imp("t:ResolvedGroup@@/lib/crud/resolve-filters");
const ResolvedNode = imp("t:ResolvedNode@@/lib/crud/resolve-filters");
const ResolvedRelation = imp("t:ResolvedRelation@@/lib/crud/resolve-filters");
const ResolvedSort = imp("t:ResolvedSort@@/lib/crud/resolve-filters");

// Written to lib/crud/prisma-filters.ts for orm "prisma" only: the Prisma adapter for the
// shared rules in lib/crud/resolve-filters.ts. Mirrors kysely-filters.ts — keep them in sync.
const writePrismaFilters = () => code`
/**
 * Compiles a query resolved by lib/crud/resolve-filters.ts into Prisma 'findMany' arguments.
 * 'caseInsensitive' adds Prisma's 'mode: "insensitive"' to string comparisons — supported on
 * PostgreSQL and MongoDB, but rejected by Prisma's SQLite connector, so callers pass 'false' there.
 */

type Where = Record<string, any>;

/** Matches no record: Prisma treats an empty OR as false. */
const NOTHING: Where = { OR: [] };

/** Builds the Prisma 'where' fragment for one resolved filter. Prisma escapes LIKE wildcards itself. */
export function buildPrismaFilterCondition(filter: ${ResolvedFilter}, caseInsensitive = true): Where {
  if (filter.operator === "range") return { [filter.field]: { gte: filter.value.gte, lt: filter.value.lt } };
  const mode = filter.kind === "string" && caseInsensitive ? { mode: "insensitive" } : {};
  return { [filter.field]: { [filter.operator]: filter.value, ...mode } };
}

function buildPrismaRelation(node: ${ResolvedRelation}, caseInsensitive: boolean): Where {
  const { name, many, required } = node.relation;
  const where = node.where ? buildPrismaWhere(node.where, caseInsensitive) : null;

  // Collections map onto Prisma's own list filters; an empty 'where' means "any record".
  if (many) return { [name]: { [node.mode]: where ?? {} } };

  // To-one: 'is' / 'is: null' (the latter only exists on optional relations).
  const matches = where ? { [name]: { is: where } } : required ? {} : { [name]: { isNot: null } };
  const absent = required ? NOTHING : { [name]: { is: null } };
  switch (node.mode) {
    case "some":
      return matches;
    case "none":
      return where ? { NOT: matches } : absent;
    case "every":
      // Holds when there is no related record, or it matches.
      return where ? (required ? matches : { OR: [absent, matches] }) : {};
  }
}

/** Compiles a resolved filter tree into a Prisma 'where'. */
export function buildPrismaWhere(node: ${ResolvedNode}, caseInsensitive: boolean): Where {
  if (node.type === "condition") return buildPrismaFilterCondition(node.filter, caseInsensitive);
  if (node.type === "relation") return buildPrismaRelation(node, caseInsensitive);

  const children = node.children.map((child) => buildPrismaWhere(child, caseInsensitive));
  // An empty group matches everything, whichever its combinator.
  const combined = children.length === 0 ? {} : node.combinator === "and" ? { AND: children } : { OR: children };
  return node.not ? { NOT: combined } : combined;
}

/** Matches 'term' as a substring of any of 'searchFields' (the model's string fields). */
export function buildPrismaSearch(searchFields: string[], term: string, caseInsensitive: boolean): Where | null {
  if (!term || searchFields.length === 0) return null;
  return {
    OR: searchFields.map((field) => ({ [field]: { contains: term, ...(caseInsensitive ? { mode: "insensitive" } : {}) } })),
  };
}

export interface PrismaListQuery {
  filter: ${ResolvedGroup} | null;
  orderBy: ${ResolvedSort}[];
  search: string;
  searchFields: string[];
  caseInsensitive: boolean;
}

/** The 'where' and 'orderBy' a list page passes to both 'findMany' and 'count'. */
export function buildPrismaListArgs(query: PrismaListQuery): {
  where: Where;
  orderBy?: Record<string, "asc" | "desc">[];
} {
  const conditions: Where[] = [];

  const search = buildPrismaSearch(query.searchFields, query.search, query.caseInsensitive);
  if (search) conditions.push(search);
  if (query.filter && query.filter.combinator === "and" && !query.filter.not) {
    // A top-level AND group's children join the search condition directly.
    for (const child of query.filter.children) conditions.push(buildPrismaWhere(child, query.caseInsensitive));
  } else if (query.filter) {
    conditions.push(buildPrismaWhere(query.filter, query.caseInsensitive));
  }

  return {
    where: conditions.length > 0 ? { AND: conditions } : {},
    ...(query.orderBy.length > 0 ? { orderBy: query.orderBy.map((s) => ({ [s.field]: s.order })) } : {}),
  };
}
`;

export default writePrismaFilters;
