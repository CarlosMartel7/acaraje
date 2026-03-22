import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSchema } from "@/lib/schema-parser";

// Safely get a Prisma model delegate by name (case-insensitive)
function getDelegate(modelName: string): any {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as any)[key];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";

  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }

    // Build search where clause using schema field info
    const schema = parseSchema();
    const modelDef = schema.models.find((m) => m.name.toLowerCase() === model.toLowerCase());

    let where: any = {};
    if (search && modelDef) {
      const stringFields = modelDef.fields.filter((f) => f.type === "String" && !f.isRelation && !f.isList);
      if (stringFields.length > 0) {
        where = {
          OR: stringFields.map((f) => ({
            [f.name]: { contains: search, mode: "insensitive" },
          })),
        };
      }
    }

    const [records, total] = await Promise.all([
      delegate.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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
    // Fallback without orderBy if model has no createdAt
    try {
      const delegate = getDelegate(model);
      const schema = parseSchema();
      const modelDef = schema.models.find((m) => m.name.toLowerCase() === model.toLowerCase());
      let where: any = {};
      if (search && modelDef) {
        const stringFields = modelDef.fields.filter((f) => f.type === "String" && !f.isRelation && !f.isList);
        if (stringFields.length > 0) {
          where = {
            OR: stringFields.map((f) => ({
              [f.name]: { contains: search, mode: "insensitive" },
            })),
          };
        }
      }
      const [records, total] = await Promise.all([
        delegate.findMany({ where, skip: (page - 1) * pageSize, take: pageSize }),
        delegate.count({ where }),
      ]);
      return NextResponse.json({
        records,
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      });
    } catch (err2: any) {
      return NextResponse.json({ error: err2.message || "Failed to fetch records" }, { status: 500 });
    }
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
