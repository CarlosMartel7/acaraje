import { code, imp, joinCode } from "ts-poet";

// Ts-poet imports
const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const isOperatorValidForKind = imp("isOperatorValidForKind@@/lib/resolve-filters");
const parseFilterValue = imp("parseFilterValue@@/lib/resolve-filters");
const buildKyselyFilterCondition = imp("buildKyselyFilterCondition@@/lib/resolve-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/resolve-filters");

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
function inferFieldKind(field: PrismaSchema.PrismaField): "string" | "number" | "boolean" | "datetime" | "enum" {
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

function scalarFields(model: PrismaSchema.PrismaModel) {
  return model.fields.filter((f) => !f.isRelation && !f.isList);
}

function fieldKindsLiteral(model: PrismaSchema.PrismaModel) {
  const entries = scalarFields(model).map(
    (f) => `${JSON.stringify(f.name)}: ${JSON.stringify(inferFieldKind(f))}`
  );
  return `{ ${entries.join(", ")} }`;
}

export function writeReadFoo(
  model: PrismaSchema.PrismaModel,
  db: string,
  table: string,
  caseInsensitive: boolean,
) {
  const stringFields = scalarFields(model).filter((f) => inferFieldKind(f) === "string");

  const likeOp = caseInsensitive ? "ilike" : "like";

  const orClauses = stringFields.map(
    (f) => code`eb(${JSON.stringify(f.name)}, ${JSON.stringify(likeOp)}, "%" + search + "%")`
  );

  const searchBlock =
    stringFields.length > 0
      ? code`
        if (search) {
          conditions.push(eb.or([${joinCode(orClauses, { on: ", " })}]));
        }
      `
      : code`// No string fields on this model to search`;

  const hasCreatedAt = scalarFields(model).some((f) => f.name === "createdAt");

  const body = code`
    const FIELD_KINDS: Record<string, "string" | "number" | "boolean" | "datetime" | "enum"> = ${fieldKindsLiteral(model)};

    export async function GET(req: ${NextRequest}) {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");
      const search = searchParams.get("search") || "";
      const sortField = searchParams.get("sortField") || "";
      const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
      const filtersParam = searchParams.get("filters") || "";

      try {
        let filters: Crud.FilterCondition[] = [];
        if (filtersParam) {
          try {
            const parsed = JSON.parse(filtersParam);
            if (!Array.isArray(parsed)) throw new Error("filters must be an array");
            filters = parsed;
          } catch {
            return ${NextResponse}.json({ error: "Invalid filters parameter: must be a JSON array" }, { status: 400 });
          }
        }

        const parsedFilters: { field: string; kind: string; operator: string; value: any }[] = [];
        for (const f of filters) {
          const kind = FIELD_KINDS[f.field];
          if (!kind || !${isOperatorValidForKind}(kind as any, f.operator)) continue;

          const parsedValue = ${parseFilterValue}(kind as any, f.value);
          if (!parsedValue.ok) {
            return ${NextResponse}.json({ error: parsedValue.error }, { status: 400 });
          }

          parsedFilters.push({ field: f.field, kind, operator: f.operator, value: parsedValue.value });
        }

        let orderColumn: string | undefined;
        if (sortField) {
          if (!FIELD_KINDS[sortField]) {
            return ${NextResponse}.json({ error: "Sort field is not sortable" }, { status: 400 });
          }
          orderColumn = sortField;
        }${hasCreatedAt ? code` else {
          orderColumn = "createdAt";
        }` : ""}

        const applyWhere = (eb: any) => {
          const conditions: any[] = [];

          ${searchBlock}

          for (const f of parsedFilters) {
            conditions.push(${buildKyselyFilterCondition}(eb, f.field, f.kind as any, f.operator as any, f.value, ${caseInsensitive}));
          }

          return conditions.length > 0 ? eb.and(conditions) : eb.and([]);
        };

        let recordsQuery = ${db}.selectFrom("${table}").selectAll().where(applyWhere);
        if (orderColumn) {
          recordsQuery = recordsQuery.orderBy(orderColumn as any, sortOrder);
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
