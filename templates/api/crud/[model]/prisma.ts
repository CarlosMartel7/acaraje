import { code, imp } from "ts-poet";

// Ts-poet imports
const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const parseFiltersParam = imp("parseFiltersParam@@/lib/crud/resolve-filters");
const resolveListQuery = imp("resolveListQuery@@/lib/crud/resolve-filters");
const filterSchema = imp("filterSchema@@/lib/crud/filter-schema");
const buildPrismaListArgs = imp("buildPrismaListArgs@@/lib/crud/prisma-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/crud/resolve-filters");

export function writeReadFoo(
  model: PrismaSchema.PrismaModel,
  prisma: string,
  caseInsensitive: boolean,
) {
  const body = code`
    const MODEL = ${JSON.stringify(model.name)};

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
          ${filterSchema},
          MODEL,
        );
        if (!query.ok) {
          return ${NextResponse}.json({ error: query.error }, { status: 400 });
        }

        const { where, orderBy } = ${buildPrismaListArgs}({
          filter: query.filter,
          orderBy: query.orderBy,
          search,
          searchFields: ${filterSchema}.models[MODEL].searchFields,
          caseInsensitive: ${caseInsensitive},
        });

        const [records, total] = await Promise.all([
          ${prisma}.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            ...(orderBy ? { orderBy } : {}),
          }),
          ${prisma}.count({ where }),
        ]);

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
  prisma: string
) => {

  const body = code`
  export async function POST(req: ${NextRequest}) {

  try {
    const body = await req.json();
    const sanitized = ${sanitizeInput}(body);

    const record = await ${prisma}.create({ data: sanitized });

    return ${NextResponse}.json(record, { status: 201 });
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message || "Failed to create record" }, { status: 500 });
  }
}
`

  return body
}

export const writeDeleteFoo = (
  prisma: string
) => {

  const body = code`
export async function DELETE(
  req: ${NextRequest},
) {
  try {

    const body = await req.json();
    if (body.all === true) {
      const result = await ${prisma}.deleteMany({});
      return ${NextResponse}.json({ success: true, deleted: result.count });
    }

    const ids = Array.isArray(body.ids) ? body.ids : [body.id].filter(Boolean);
    if (ids.length === 0) {
      return ${NextResponse}.json({ error: "No ids provided" }, { status: 400 });
    }

    const result = await ${prisma}.deleteMany({ where: { id: { in: ids } } });
    return ${NextResponse}.json({ success: true, deleted: result.count });
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
