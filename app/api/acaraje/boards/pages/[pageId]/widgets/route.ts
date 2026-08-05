import { NextRequest, NextResponse } from "next/server";
import { addWidget } from "@/lib/boards-config";

export async function POST(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  try {
    const { title, metric } = await req.json();
    if (!title || !metric) {
      return NextResponse.json({ error: "title and metric are required" }, { status: 400 });
    }
    const widget = addWidget(pageId, { title, metric });
    if (!widget) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(widget, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add widget" }, { status: 500 });
  }
}
