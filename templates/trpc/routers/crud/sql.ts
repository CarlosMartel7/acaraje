import { code, imp } from "ts-poet";
import type { SqlDialect } from "../../../api/crud/[model]/sql";

const TRPCError = imp("TRPCError@@trpc/server");
const internalError = imp("internalError@@/server/trpc/init");
const CrudHandlers = imp("t:CrudHandlers@@/server/trpc/routers/crud/types");
const db = imp("db@@/lib/db");
const resolveListQuery = imp("resolveListQuery@@/lib/crud/resolve-filters");
const filterSchema = imp("filterSchema@@/lib/crud/filter-schema");
const buildKyselyWhere = imp("buildKyselyWhere@@/lib/crud/kysely-filters");
const applyKyselyOrder = imp("applyKyselyOrder@@/lib/crud/kysely-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/crud/resolve-filters");

const LABEL_CANDIDATES = ["name", "title", "email", "code", "slug", "label", "storeName"];

// Written to server/trpc/routers/crud/models/<Model>.ts for orm "pure-sql".
// Mirrors templates/api/crud/[model]/{sql,id/sql,options/sql}.ts — keep them in sync. Filtering
// and sorting go through the same shared rules and Kysely adapter the REST sql routes use.
export function writeKyselyCrudHandlers(
  model: PrismaSchema.PrismaModel,
  table: string,
  dialect: SqlDialect,
) {
  // Raw SQL's `ilike` is only understood by PostgreSQL — MySQL and SQLite fall back to `like`.
  const likeOp = JSON.stringify(dialect === "postgresql" ? "ilike" : "like");
  const tableName = JSON.stringify(table);

  const labelField = model.fields.find((f) => LABEL_CANDIDATES.includes(f.name))?.name ?? null;
  const optionsWhere = labelField
    ? code`
      if (search) {
        query = query.where(${JSON.stringify(labelField)}, ${likeOp}, "%" + search + "%");
      }`
    : code`// No label field found on this model; search is a no-op`;
  const optionsColumns = labelField ? `["id", ${JSON.stringify(labelField)}]` : `["id"]`;
  const optionsLabel = labelField ? `r.${labelField}` : "r.id";

  return code`
const MODEL = ${JSON.stringify(model.name)};

// Relation-picker page size, matching the REST options route.
const OPTIONS_PAGE_SIZE = 20;

export const handlers: ${CrudHandlers} = {
  async list({ page, pageSize, search, filters = [], sortField, sortOrder = "desc" }) {
    const query = ${resolveListQuery}({ filters, sortField, sortOrder }, ${filterSchema}, MODEL);
    if (!query.ok) throw new ${TRPCError}({ code: "BAD_REQUEST", message: query.error });

    const applyWhere = (eb: any) =>
      ${buildKyselyWhere}(eb, {
        table: ${tableName},
        filter: query.filter,
        search,
        searchFields: ${filterSchema}.models[MODEL].searchFields,
        dialect: ${JSON.stringify(dialect)},
      });

    try {
      const recordsQuery = ${applyKyselyOrder}(
        ${db}.selectFrom(${tableName} as any).selectAll().where(applyWhere),
        query.orderBy,
        ${filterSchema}.models[MODEL].fieldKinds,
        ${JSON.stringify(dialect)},
      ).limit(pageSize).offset((page - 1) * pageSize);

      const countQuery = ${db}
        .selectFrom(${tableName} as any)
        .select((eb: any) => eb.fn.countAll().as("count"))
        .where(applyWhere);

      const [records, countResult] = await Promise.all([recordsQuery.execute(), countQuery.executeTakeFirst()]);
      const total = Number((countResult as any)?.count ?? 0);

      return { records, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
    } catch (err) {
      ${internalError}(err, "Failed to fetch records");
    }
  },

  async get(id) {
    let record;
    try {
      record = await ${db}.selectFrom(${tableName} as any).selectAll().where("id" as any, "=", id).executeTakeFirst();
    } catch (err) {
      ${internalError}(err, "Failed to fetch record");
    }
    if (!record) throw new ${TRPCError}({ code: "NOT_FOUND", message: "Record not found" });
    return record;
  },

  // .returningAll() works on Postgres and SQLite; MySQL has no RETURNING clause, so swap these
  // for a plain .execute() followed by a re-fetch on that dialect.
  async create(data) {
    try {
      return await ${db}
        .insertInto(${tableName} as any)
        .values(${sanitizeInput}(data) as any)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      ${internalError}(err, "Failed to create record");
    }
  },

  async update(id, data) {
    try {
      return await ${db}
        .updateTable(${tableName} as any)
        .set(${sanitizeInput}(data) as any)
        .where("id" as any, "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (err) {
      ${internalError}(err, "Failed to update record");
    }
  },

  async delete(id) {
    try {
      await ${db}.deleteFrom(${tableName} as any).where("id" as any, "=", id).execute();
      return { success: true };
    } catch (err) {
      ${internalError}(err, "Failed to delete record");
    }
  },

  async deleteMany(ids) {
    try {
      const result = await ${db}.deleteFrom(${tableName} as any).where("id" as any, "in", ids).executeTakeFirst();
      return { success: true, deleted: Number(result.numDeletedRows ?? 0) };
    } catch (err) {
      ${internalError}(err, "Failed to delete records");
    }
  },

  async deleteAll() {
    try {
      const result = await ${db}.deleteFrom(${tableName} as any).executeTakeFirst();
      return { success: true, deleted: Number(result.numDeletedRows ?? 0) };
    } catch (err) {
      ${internalError}(err, "Failed to delete records");
    }
  },

  async options(page, search) {
    try {
      let query = ${db}.selectFrom(${tableName} as any).select(${optionsColumns} as any);
      ${optionsWhere}

      // Fetch one extra record to know whether another page follows, without a separate count query.
      const records = await query
        .offset((page - 1) * OPTIONS_PAGE_SIZE)
        .limit(OPTIONS_PAGE_SIZE + 1)
        .execute();

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

export default writeKyselyCrudHandlers;
