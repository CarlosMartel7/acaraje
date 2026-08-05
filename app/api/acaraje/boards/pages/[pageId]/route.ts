import { NextRequest, NextResponse } from "next/server";
import { renamePage, deletePage } from "@/lib/boards-config";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Page name is required" }, { status: 400 });
    }
    const page = renamePage(pageId, name.trim());
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to rename page" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  try {
    const success = deletePage(pageId);
    if (!success) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete page" }, { status: 500 });
  }
}
