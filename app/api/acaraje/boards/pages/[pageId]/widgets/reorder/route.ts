import { NextRequest, NextResponse } from "next/server";
import { reorderWidgets } from "@/lib/boards-config";

export async function POST(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  try {
    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds must be an array" }, { status: 400 });
    }
    const widgets = reorderWidgets(pageId, orderedIds);
    return NextResponse.json({ widgets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reorder widgets" }, { status: 500 });
  }
}
