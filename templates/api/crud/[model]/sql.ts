import { code, imp } from "ts-poet";

// Ts-poet imports
const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const parseFiltersParam = imp("parseFiltersParam@@/lib/crud/resolve-filters");
const resolveListQuery = imp("resolveListQuery@@/lib/crud/resolve-filters");
const FieldKindMap = imp("t:FieldKindMap@@/lib/crud/resolve-filters");
const ResolvedSort = imp("t:ResolvedSort@@/lib/crud/resolve-filters");
const buildKyselyWhere = imp("buildKyselyWhere@@/lib/crud/kysely-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/crud/resolve-filters");

// Prisma-schema-style scalar type names.
const PRISMA_NUMBER_TYPES = new Set(["Int", "Float", "Decimal", "BigInt"]);

// Raw-SQL-style scalar type names (as produced by sql-parser.ts across postgres/mysql/sqlite),
// with any `(...)` size/precision argument already stripped and the name upper-cased.
const SQL_STRING_TYPES = new Set(["TEXT", "VARCHAR", "CHAR", "NVARCHAR", "NCHAR", "CLOB", "UUID"]);
const SQL_NUMBER_TYPES = new Set([
  "INT", "INTEGER", "SMALLINT", "MEDIUMINT", "BIGINT", "TINYINT",
  "SERIAL", "BIGSERIAL", "SMALLSERIAL",
  "FLOAT", "DOUBLE", "REAL", "DECIMAL", "NUMERIC", "MONEY",
]);
const SQL_BOOLEAN_TYPES = new Set(["BOOLEAN", "BOOL"]);
const SQL_DATETIME_TYPES = new Set(["DATETIME", "TIMESTAMP", "TIMESTAMPTZ", "DATE", "TIME", "TIMETZ"]);

function baseSqlType(type: string): string {
  return type.replace(/\(.*\)/, "").trim().toUpperCase();
}

// Kysely has no runtime schema/field metadata to introspect (unlike a Prisma delegate), so the
// field -> kind map is resolved once here, at generation time, from the parsed model, and baked
// into the route as a plain object literal. The model may come from either prisma-parser.ts
// (Prisma type names) or sql-parser.ts (raw SQL type names), so both vocabularies are handled.
export function inferFieldKind(field: PrismaSchema.PrismaField): "string" | "number" | "boolean" | "datetime" | "enum" {
  // A `-- @enum A | B | C` / `// @enum ...` column is an enum regardless of its storage type
  // (e.g. sqlite backs it with TEXT).
  if (field.pseudoEnumValues && field.pseudoEnumValues.length > 0) return "enum";

  if (field.type === "String") return "string";
  if (field.type === "Boolean") return "boolean";
  if (field.type === "DateTime") return "datetime";
  if (PRISMA_NUMBER_TYPES.has(field.type)) return "number";

  const base = baseSqlType(field.type);
  if (SQL_STRING_TYPES.has(base)) return "string";
  if (SQL_NUMBER_TYPES.has(base)) return "number";
  if (SQL_BOOLEAN_TYPES.has(base)) return "boolean";
  if (SQL_DATETIME_TYPES.has(base)) return "datetime";

  // Anything left is a named Prisma enum, a Postgres `CREATE TYPE ... AS ENUM`, or MySQL's
  // inline `ENUM(...)`.
  return "enum";
}

export function scalarFields(model: PrismaSchema.PrismaModel) {
  return model.fields.filter((f) => !f.isRelation && !f.isList);
}

export function fieldKindsLiteral(model: PrismaSchema.PrismaModel) {
  const entries = scalarFields(model).map(
    (f) => `${JSON.stringify(f.name)}: ${JSON.stringify(inferFieldKind(f))}`
  );
  return `{ ${entries.join(", ")} }`;
}

// Generation-time list-query metadata shared by the REST route and the tRPC handlers: the
// model's searchable string columns, and the default order when no sort is requested.
export function searchFieldsLiteral(model: PrismaSchema.PrismaModel) {
  const names = scalarFields(model).filter((f) => inferFieldKind(f) === "string").map((f) => f.name);
  return JSON.stringify(names);
}

export function defaultSortLiteral(model: PrismaSchema.PrismaModel) {
  const hasCreatedAt = scalarFields(model).some((f) => f.name === "createdAt");
  return hasCreatedAt ? `{ field: "createdAt", order: "desc" }` : "null";
}

export function writeReadFoo(
  model: PrismaSchema.PrismaModel,
  db: string,
  table: string,
  caseInsensitive: boolean,
) {
  const body = code`
    const FIELD_KINDS: ${FieldKindMap} = ${fieldKindsLiteral(model)};
    const SEARCH_FIELDS: string[] = ${searchFieldsLiteral(model)};
    const DEFAULT_SORT: ${ResolvedSort} | null = ${defaultSortLiteral(model)};

    export async function GET(req: ${NextRequest}) {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");
      const search = searchParams.get("search") || "";

      try {
        const filtersParam = ${parseFiltersParam}(searchParams.get("filters") || "");
        if (!filtersParam.ok) {
          return ${NextResponse}.json({ error: filtersParam.error }, { status: 400 });
        }

        const query = ${resolveListQuery}(
          {
            filters: filtersParam.filters,
            sortField: searchParams.get("sortField") || "",
            sortOrder: searchParams.get("sortOrder") || "",
          },
          FIELD_KINDS,
          DEFAULT_SORT,
        );
        if (!query.ok) {
          return ${NextResponse}.json({ error: query.error }, { status: 400 });
        }

        const applyWhere = (eb: any) =>
          ${buildKyselyWhere}(eb, { filters: query.filters, search, searchFields: SEARCH_FIELDS, caseInsensitive: ${caseInsensitive} });

        let recordsQuery = ${db}.selectFrom("${table}").selectAll().where(applyWhere);
        if (query.sort) {
          recordsQuery = recordsQuery.orderBy(query.sort.field as any, query.sort.order);
        }
        recordsQuery = recordsQuery.limit(pageSize).offset((page - 1) * pageSize);

        const countQuery = ${db}
          .selectFrom("${table}")
          .select((eb: any) => eb.fn.countAll().as("count"))
          .where(applyWhere);

        const [records, countResult] = await Promise.all([
          recordsQuery.execute(),
          countQuery.executeTakeFirst(),
        ]);

        const total = Number(countResult?.count ?? 0);

        return ${NextResponse}.json({
          records,
          total,
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
        });
      } catch (err: any) {
        return ${NextResponse}.json({ error: err.message || "Failed to fetch records" }, { status: 500 });
      }
    }
  `;

  return body;
}

export const writeCreateFoo = (
  db: string,
  table: string,
) => {

  const body = code`
  export async function POST(req: ${NextRequest}) {

  try {
    const body = await req.json();
    const sanitized = ${sanitizeInput}(body);

    // .returningAll() works on Postgres and SQLite; MySQL has no RETURNING clause, so swap this
    // for a plain .execute() followed by a re-fetch on that dialect.
    const record = await ${db}
      .insertInto("${table}")
      .values(sanitized as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    return ${NextResponse}.json(record, { status: 201 });
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message || "Failed to create record" }, { status: 500 });
  }
}
`

  return body
}

export const writeDeleteFoo = (
  db: string,
  table: string,
) => {

  const body = code`
export async function DELETE(
  req: ${NextRequest},
) {
  try {

    const body = await req.json();
    if (body.all === true) {
      const result = await ${db}.deleteFrom("${table}").executeTakeFirst();
      return ${NextResponse}.json({ success: true, deleted: Number(result.numDeletedRows ?? 0) });
    }

    const ids = Array.isArray(body.ids) ? body.ids : [body.id].filter(Boolean);
    if (ids.length === 0) {
      return ${NextResponse}.json({ error: "No ids provided" }, { status: 400 });
    }

    const result = await ${db}.deleteFrom("${table}").where("id", "in", ids).executeTakeFirst();
    return ${NextResponse}.json({ success: true, deleted: Number(result.numDeletedRows ?? 0) });
  } catch (err: any) {
    return ${NextResponse}.json(
      { error: err.message || "Failed to delete records" },
      { status: 500 }
    );
  }
}
`

  return body
}
