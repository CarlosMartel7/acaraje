import { code, imp, joinCode } from "ts-poet";

const TRPCError = imp("TRPCError@@trpc/server");
const internalError = imp("internalError@@/server/trpc/init");
const CrudHandlers = imp("t:CrudHandlers@@/server/trpc/routers/crud/types");
const prismaClient = imp("prisma@@/lib/prisma");
const getFieldKind = imp("getFieldKind@@/lib/crud/resolve-filters");
const isFilterableField = imp("isFilterableField@@/lib/crud/resolve-filters");
const isOperatorValidForKind = imp("isOperatorValidForKind@@/lib/crud/resolve-filters");
const parseFilterValue = imp("parseFilterValue@@/lib/crud/resolve-filters");
const buildPrismaFilterCondition = imp("buildPrismaFilterCondition@@/lib/crud/resolve-filters");
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

  const stringFields = model.fields.filter((f) => f.type === "String" && !f.isRelation && !f.isList);
  const mode = caseInsensitive ? `, mode: "insensitive"` : "";
  const searchBlock =
    stringFields.length > 0
      ? code`
      if (search) {
        searchQuery.push({ OR: [${joinCode(
          stringFields.map((f) => code`{ ${f.name}: { contains: search${mode} } }`),
          { on: ", " },
        )}] });
      }`
      : code`// No string fields on this model to search`;

  const labelField = model.fields.find((f) => LABEL_CANDIDATES.includes(f.name))?.name ?? null;
  const optionsWhere = labelField ? `{ ${labelField}: { contains: search${mode} } }` : "undefined";
  const optionsSelect = labelField ? `{ id: true, ${labelField}: true }` : `{ id: true }`;
  const optionsLabel = labelField ? `r.${labelField}` : "r.id";

  return code`
const FIELDS: Record<string, { type: string; isRelation: boolean; isList: boolean }> = ${fieldsLiteral};
const ENUM_NAMES = new Set<string>(${enumNamesLiteral});

// Relation-picker page size, matching the REST options route.
const OPTIONS_PAGE_SIZE = 20;

export const handlers: ${CrudHandlers} = {
  async list({ page, pageSize, search, filters = [], sortField, sortOrder = "desc" }) {
    const searchQuery: any[] = [];
    ${searchBlock}

    for (const f of filters) {
      const field = FIELDS[f.field];
      if (!field || !${isFilterableField}(field, ENUM_NAMES)) continue;

      const kind = ${getFieldKind}(field.type, ENUM_NAMES)!;
      if (!${isOperatorValidForKind}(kind, f.operator)) continue;

      const parsedValue = ${parseFilterValue}(kind, f.value);
      if (!parsedValue.ok) throw new ${TRPCError}({ code: "BAD_REQUEST", message: parsedValue.error });

      searchQuery.push(${buildPrismaFilterCondition}(f.field, kind, f.operator, parsedValue.value, ${caseInsensitive}));
    }

    let orderBy: Record<string, "asc" | "desc"> | undefined;
    if (sortField) {
      const field = FIELDS[sortField];
      if (!field || !${isFilterableField}(field, ENUM_NAMES)) {
        throw new ${TRPCError}({ code: "BAD_REQUEST", message: "Sort field is not sortable" });
      }
      orderBy = { [sortField]: sortOrder };
    }${hasCreatedAt ? code` else {
      orderBy = { createdAt: "desc" };
    }` : ""}

    const where = searchQuery.length > 0 ? { AND: searchQuery } : {};

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
