import { NextRequest, NextResponse } from "next/server";
import { getMinioStorage } from "@/lib/storage/minio-storage";
import { deleteMinioFolderRecursive } from "@/lib/storage/minio-folders";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const files = (body.files as string[]) ?? [];
    const folders = (body.folders as string[]) ?? [];

    if (files.length === 0 && folders.length === 0) {
      return NextResponse.json({ error: "No files or folders to delete" }, { status: 400 });
    }

    const storage = getMinioStorage();

    for (const key of files) {
      await storage.deleteFile(key);
    }
    for (const folderId of folders) {
      await deleteMinioFolderRecursive(folderId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Drive delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
