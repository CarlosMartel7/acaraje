import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getDelegate(modelName: string): any {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as any)[key];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  const { model, id } = await params;
  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }
    const record = await delegate.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  const { model, id } = await params;
  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }
    const body = await req.json();
    const sanitized = sanitizeInput(body);
    const record = await delegate.update({ where: { id }, data: sanitized });
    return NextResponse.json(record);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  const { model, id } = await params;
  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ error: `Model "${model}" not found` }, { status: 404 });
    }
    await delegate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function sanitizeInput(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === "" || val === null || val === undefined) continue;
    out[key] = val;
  }
  return out;
}
