import { code, imp } from "ts-poet";

const TRPCError = imp("TRPCError@@trpc/server");
const internalError = imp("internalError@@/server/trpc/init");
const CrudHandlers = imp("t:CrudHandlers@@/server/trpc/routers/crud/types");
const prismaClient = imp("prisma@@/lib/prisma");
const filterableFieldKinds = imp("filterableFieldKinds@@/lib/crud/resolve-filters");
const resolveListQuery = imp("resolveListQuery@@/lib/crud/resolve-filters");
const ResolvedSort = imp("t:ResolvedSort@@/lib/crud/resolve-filters");
const buildPrismaListArgs = imp("buildPrismaListArgs@@/lib/crud/prisma-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/crud/resolve-filters");

const LABEL_CANDIDATES = ["name", "title", "email", "code", "slug", "label", "storeName"];

// Written to server/trpc/routers/crud/models/<Model>.ts for orm "prisma".
// Mirrors templates/api/crud/[model]/{prisma,id/prisma,options/prisma}.ts — keep them in sync.
//
// One deliberate difference: the field metadata filters/sorting are checked against is baked in
// here at generation time (FIELDS / ENUM_NAMES), the way the kysely flavor already does it,
// instead of reading Prisma's runtime field refs.
export function writePrismaCrudHandlers(
  schema: PrismaSchema.ParsedSchema,
  model: PrismaSchema.PrismaModel,
  caseInsensitive: boolean,
) {
  const modelVar = model.name.charAt(0).toLowerCase() + model.name.slice(1);
  const delegate = code`${prismaClient}.${modelVar}`;

  const fieldsLiteral = `{ ${model.fields
    .map((f) => `${JSON.stringify(f.name)}: { type: ${JSON.stringify(f.type)}, isRelation: ${f.isRelation}, isList: ${f.isList} }`)
    .join(", ")} }`;
  const enumNamesLiteral = JSON.stringify(schema.enums.map((e) => e.name));
  const hasCreatedAt = model.fields.some((f) => f.name === "createdAt");

  const searchFieldsLiteral = JSON.stringify(
    model.fields.filter((f) => f.type === "String" && !f.isRelation && !f.isList).map((f) => f.name),
  );
  const defaultSortLiteral = hasCreatedAt ? `{ field: "createdAt", order: "desc" }` : "null";
  const mode = caseInsensitive ? `, mode: "insensitive"` : "";

  const labelField = model.fields.find((f) => LABEL_CANDIDATES.includes(f.name))?.name ?? null;
  const optionsWhere = labelField ? `{ ${labelField}: { contains: search${mode} } }` : "undefined";
  const optionsSelect = labelField ? `{ id: true, ${labelField}: true }` : `{ id: true }`;
  const optionsLabel = labelField ? `r.${labelField}` : "r.id";

  return code`
const FIELDS: Record<string, { type: string; isRelation: boolean; isList: boolean }> = ${fieldsLiteral};
const ENUM_NAMES = new Set<string>(${enumNamesLiteral});
const FIELD_KINDS = ${filterableFieldKinds}(FIELDS, ENUM_NAMES);
const SEARCH_FIELDS: string[] = ${searchFieldsLiteral};
const DEFAULT_SORT: ${ResolvedSort} | null = ${defaultSortLiteral};

// Relation-picker page size, matching the REST options route.
const OPTIONS_PAGE_SIZE = 20;

export const handlers: ${CrudHandlers} = {
  async list({ page, pageSize, search, filters = [], sortField, sortOrder = "desc" }) {
    const query = ${resolveListQuery}({ filters, sortField, sortOrder }, FIELD_KINDS, DEFAULT_SORT);
    if (!query.ok) throw new ${TRPCError}({ code: "BAD_REQUEST", message: query.error });

    const { where, orderBy } = ${buildPrismaListArgs}({
      filters: query.filters,
      sort: query.sort,
      search,
      searchFields: SEARCH_FIELDS,
      caseInsensitive: ${caseInsensitive},
    });

    try {
      const [records, total] = await Promise.all([
        ${delegate}.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          ...(orderBy ? { orderBy } : {}),
        }),
        ${delegate}.count({ where }),
      ]);

      return { records, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
    } catch (err) {
      ${internalError}(err, "Failed to fetch records");
    }
  },

  async get(id) {
    let record;
    try {
      record = await ${delegate}.findUnique({ where: { id } as any });
    } catch (err) {
      ${internalError}(err, "Failed to fetch record");
    }
    if (!record) throw new ${TRPCError}({ code: "NOT_FOUND", message: "Record not found" });
    return record;
  },

  async create(data) {
    try {
      return await ${delegate}.create({ data: ${sanitizeInput}(data) as any });
    } catch (err) {
      ${internalError}(err, "Failed to create record");
    }
  },

  async update(id, data) {
    try {
      return await ${delegate}.update({ where: { id } as any, data: ${sanitizeInput}(data) as any });
    } catch (err) {
      ${internalError}(err, "Failed to update record");
    }
  },

  async delete(id) {
    try {
      await ${delegate}.delete({ where: { id } as any });
      return { success: true };
    } catch (err) {
      ${internalError}(err, "Failed to delete record");
    }
  },

  async deleteMany(ids) {
    try {
      const result = await ${delegate}.deleteMany({ where: { id: { in: ids } } as any });
      return { success: true, deleted: result.count };
    } catch (err) {
      ${internalError}(err, "Failed to delete records");
    }
  },

  async deleteAll() {
    try {
      const result = await ${delegate}.deleteMany({});
      return { success: true, deleted: result.count };
    } catch (err) {
      ${internalError}(err, "Failed to delete records");
    }
  },

  async options(page, search) {
    try {
      // Fetch one extra record to know whether another page follows, without a separate count query.
      const records = await ${delegate}.findMany({
        where: ${optionsWhere},
        skip: (page - 1) * OPTIONS_PAGE_SIZE,
        take: OPTIONS_PAGE_SIZE + 1,
        select: ${optionsSelect},
      });

      return {
        options: records.slice(0, OPTIONS_PAGE_SIZE).map((r: any) => ({ value: r.id, label: ${optionsLabel} })),
        hasMore: records.length > OPTIONS_PAGE_SIZE,
      };
    } catch {
      return { options: [], hasMore: false };
    }
  },
};
`;
}

export default writePrismaCrudHandlers;
