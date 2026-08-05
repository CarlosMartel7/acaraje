import { NextRequest, NextResponse } from "next/server";
import { updateWidget, removeWidget } from "@/lib/boards-config";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ pageId: string; widgetId: string }> }) {
  const { pageId, widgetId } = await params;
  try {
    const patch = await req.json();
    const widget = updateWidget(pageId, widgetId, patch);
    if (!widget) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }
    return NextResponse.json(widget);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update widget" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pageId: string; widgetId: string }> }) {
  const { pageId, widgetId } = await params;
  try {
    const success = removeWidget(pageId, widgetId);
    if (!success) {
      return NextResponse.json({ error: "Widget not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete widget" }, { status: 500 });
  }
}
