import { NextRequest, NextResponse } from "next/server";
import { listPages, createPage } from "@/lib/boards-config";

export async function GET() {
  return NextResponse.json({ pages: listPages() });
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Page name is required" }, { status: 400 });
    }
    const page = createPage(name.trim());
    return NextResponse.json(page, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create page" }, { status: 500 });
  }
}
