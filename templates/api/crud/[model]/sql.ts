import { code, imp } from "ts-poet";
import { listMetadataLiteral } from "../../../lib/crud/resolve-filters";

// Ts-poet imports
const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const parseFiltersParam = imp("parseFiltersParam@@/lib/crud/resolve-filters");
const resolveListQuery = imp("resolveListQuery@@/lib/crud/resolve-filters");
const listConfig = imp("listConfig@@/lib/crud/resolve-filters");
const buildKyselyWhere = imp("buildKyselyWhere@@/lib/crud/kysely-filters");
const applyKyselyOrder = imp("applyKyselyOrder@@/lib/crud/kysely-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/crud/resolve-filters");

/** The database a pure-SQL project targets, as the Kysely adapter (lib/crud/kysely-filters.ts) names it. */
export type SqlDialect = "postgresql" | "mysql" | "sqlite";

export function writeReadFoo(
  schema: PrismaSchema.ParsedSchema,
  model: PrismaSchema.PrismaModel,
  db: string,
  table: string,
  dialect: SqlDialect,
) {
  const body = code`
    const LIST = ${listConfig}(${listMetadataLiteral(schema, model)});

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
          LIST,
        );
        if (!query.ok) {
          return ${NextResponse}.json({ error: query.error }, { status: 400 });
        }

        const applyWhere = (eb: any) =>
          ${buildKyselyWhere}(eb, { filters: query.filters, search, searchFields: LIST.searchFields, dialect: ${JSON.stringify(dialect)} });

        const recordsQuery = ${applyKyselyOrder}(
          ${db}.selectFrom("${table}").selectAll().where(applyWhere),
          query.orderBy,
          LIST.fieldKinds,
          ${JSON.stringify(dialect)},
        ).limit(pageSize).offset((page - 1) * pageSize);

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
