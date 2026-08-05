import { NextRequest, NextResponse } from "next/server";
import { reorderPages } from "@/lib/boards-config";

export async function POST(req: NextRequest) {
  try {
    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds must be an array" }, { status: 400 });
    }
    const pages = reorderPages(orderedIds);
    return NextResponse.json({ pages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reorder pages" }, { status: 500 });
  }
}
