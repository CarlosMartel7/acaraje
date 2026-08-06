import { NextRequest, NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";
import { getDelegate } from "@/lib/prisma-delegate";
import { getFieldKind, isFilterableField, isOperatorValidForKind, parseFilterValue, buildPrismaFilterCondition } from "@/lib/field-kind";

export async function GET(req: NextRequest, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const sortField = searchParams.get("sortField") || "";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const filtersParam = searchParams.get("filters") || "";

  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }

    const schema = parseSchema();
    const modelDef = schema.models.find((m) => m.name.toLowerCase() === model.toLowerCase());
    if (!modelDef) {
      return NextResponse.json({ error: `Model "${model}" not found in schema` }, { status: 404 });
    }
    const enumNames = new Set(schema.enums.map((e) => e.name));
    // Prisma's `mode: "insensitive"` is supported on PostgreSQL/MongoDB but throws a validation
    // error on the SQLite connector.
    const caseInsensitive = schema.datasource?.provider !== "sqlite";

    // Build `where`: existing free-text search (OR across String fields) ANDed with any
    // explicit filters (each of which ANDs together).
    const whereParts: Record<string, any>[] = [];

    if (search) {
      const stringFields = modelDef.fields.filter((f) => f.type === "String" && !f.isRelation && !f.isList);
      if (stringFields.length > 0) {
        whereParts.push({
          OR: stringFields.map((f) => ({
            [f.name]: { contains: search, ...(caseInsensitive ? { mode: "insensitive" } : {}) },
          })),
        });
      }
    }

    if (filtersParam) {
      let filters: Crud.FilterCondition[];
      try {
        const parsed = JSON.parse(filtersParam);
        if (!Array.isArray(parsed)) throw new Error("filters must be an array");
        filters = parsed;
      } catch {
        return NextResponse.json({ error: "Invalid filters parameter: must be a JSON array" }, { status: 400 });
      }

      for (const f of filters) {
        const field = modelDef.fields.find((mf) => mf.name === f.field);
        if (!field || !isFilterableField(field, enumNames)) {
          return NextResponse.json({ error: `Filter field "${f.field}" is not filterable on model "${model}"` }, { status: 400 });
        }
        const kind = getFieldKind(field.type, enumNames)!;
        if (!isOperatorValidForKind(kind, f.operator)) {
          return NextResponse.json({ error: `Invalid operator "${f.operator}" for field "${f.field}"` }, { status: 400 });
        }
        const parsedValue = parseFilterValue(kind, f.value);
        if (!parsedValue.ok) {
          return NextResponse.json({ error: parsedValue.error }, { status: 400 });
        }
        whereParts.push(buildPrismaFilterCondition(f.field, kind, f.operator, parsedValue.value, caseInsensitive));
      }
    }

    const where = whereParts.length > 0 ? { AND: whereParts } : {};

    // Build `orderBy`: explicit sort field (validated against the same filterable whitelist) or
    // fall back to `createdAt` only if the model actually has that field.
    let orderBy: Record<string, "asc" | "desc"> | undefined;
    if (sortField) {
      const field = modelDef.fields.find((mf) => mf.name === sortField);
      if (!field || !isFilterableField(field, enumNames)) {
        return NextResponse.json({ error: `Sort field "${sortField}" is not sortable on model "${model}"` }, { status: 400 });
      }
      orderBy = { [sortField]: sortOrder };
    } else if (modelDef.fields.some((f) => f.name === "createdAt")) {
      orderBy = { createdAt: "desc" };
    }

    const [records, total] = await Promise.all([
      delegate.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...(orderBy ? { orderBy } : {}),
      }),
      delegate.count({ where }),
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }

    const body = await req.json();
    const sanitized = sanitizeInput(body);
    const record = await delegate.create({ data: sanitized });
    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create record" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  const { model } = await params;
  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }

    const body = await req.json();
    if (body.all === true) {
      const result = await delegate.deleteMany({});
      return NextResponse.json({ success: true, deleted: result.count });
    }

    const ids = Array.isArray(body.ids) ? body.ids : [body.id].filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const result = await delegate.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete records" },
      { status: 500 }
    );
  }
}

// Remove empty strings for optional fields, parse numbers/booleans
function sanitizeInput(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === "" || val === null || val === undefined) continue;
    out[key] = val;
  }
  return out;
}
