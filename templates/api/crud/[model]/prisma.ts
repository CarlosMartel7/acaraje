import { code, imp, joinCode } from "ts-poet";

// Ts-poet imports
const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const getFieldKind = imp("getFieldKind@@/lib/resolve-filters");
const isFilterableField = imp("isFilterableField@@/lib/resolve-filters");
const isOperatorValidForKind = imp("isOperatorValidForKind@@/lib/resolve-filters");
const parseFilterValue = imp("parseFilterValue@@/lib/resolve-filters");
const buildPrismaFilterCondition = imp("buildPrismaFilterCondition@@/lib/resolve-filters");
const sanitizeInput = imp("sanitizeInput@@/lib/resolve-filters");

export function writeReadFoo(
  model: PrismaSchema.PrismaModel,
  prisma: string,
  caseInsensitive: boolean,
): string {
  const stringFields = model.fields.filter(
    (f) => f.type === "String" && !f.isRelation && !f.isList
  );

  const orClauses = stringFields.map(
    (f) =>
      code`{ ${f.name}: { contains: search${caseInsensitive ? code`, mode: "insensitive"` : ""
        } } }`
  );

  const searchBlock =
    stringFields.length > 0
      ? code`
        if (search) {
          searchQuery.push({ OR: [${joinCode(orClauses, { on: ", " })}] });
        }
      `
      : code`// No string fields on this model to search`;

  const body = code`
    export async function GET(req: ${NextRequest}) {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");
      const search = searchParams.get("search") || "";
      const sortField = searchParams.get("sortField") || "";
      const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
      const filtersParam = searchParams.get("filters") || "";

      try {
        const searchQuery: any[] = [];

        ${searchBlock}

        if (filtersParam) {
          let filters: Crud.FilterCondition[];
          try {
            const parsed = JSON.parse(filtersParam);
            if (!Array.isArray(parsed)) throw new Error("filters must be an array");
            filters = parsed;
          } catch {
            return ${NextResponse}.json({ error: "Invalid filters parameter: must be a JSON array" }, { status: 400 });
          }

          for (const f of filters) {
            const field = ${prisma}.fields[f.field];
            if (!field) continue;

            const kind = ${getFieldKind}(field, enumNames)!;
            if (!${isOperatorValidForKind}(kind, f.operator)) continue;

            const parsedValue = ${parseFilterValue}(kind, f.value);
            if (!parsedValue.ok) {
              return ${NextResponse}.json({ error: parsedValue.error }, { status: 400 });
            }

            searchQuery.push(${buildPrismaFilterCondition}(f.field, kind, f.operator, parsedValue.value, ${caseInsensitive}));
          }
        }

        let orderBy: Record<string, "asc" | "desc"> | undefined;
        if (sortField) {
          const field = ${prisma}.fields[sortField];
          if (!field || !${isFilterableField}(field, enumNames)) {
            return ${NextResponse}.json({ error: "Sort field is not sortable" }, { status: 400 });
          }
          orderBy = { [sortField]: sortOrder };
        } else if (${prisma}.fields.createdAt) {
          orderBy = { createdAt: "desc" };
        }

        const where = searchQuery.length > 0 ? { AND: searchQuery } : {};

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

  return body.toString();
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
