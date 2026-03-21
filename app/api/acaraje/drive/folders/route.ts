import { NextRequest, NextResponse } from "next/server";
import { createMinioFolder, deleteMinioFolderRecursive, listMinioFoldersFlat } from "@/lib/storage/minio-folders";

export async function GET() {
  try {
    const records = await listMinioFoldersFlat();
    const folders = records.map((f) => ({
      id: f.id,
      name: f.name,
      parents: f.parents,
      webViewLink: undefined as string | undefined,
    }));
    return NextResponse.json({ folders });
  } catch (err) {
    console.error("Drive list folders error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to list folders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = (body.name as string) || "Test Folder";
    const rawParent = body.parentId as string | undefined;
    const parentId = rawParent && rawParent !== "root" ? rawParent : undefined;
    const created = await createMinioFolder(parentId, name);
    return NextResponse.json({
      id: created.id,
      name: created.name,
      webViewLink: undefined,
    });
  } catch (err) {
    console.error("Drive create folder error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create folder" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const folderId = request.nextUrl.searchParams.get("folderId");
    if (!folderId) {
      return NextResponse.json({ error: "Missing folderId" }, { status: 400 });
    }
    await deleteMinioFolderRecursive(folderId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Drive delete folder error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete folder" }, { status: 500 });
  }
}
