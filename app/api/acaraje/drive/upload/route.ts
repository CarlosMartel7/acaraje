import { NextRequest, NextResponse } from "next/server";
import { getMinioStorage } from "@/lib/storage/minio-storage";
import { normalizeFolderPrefix, sanitizeObjectName } from "@/lib/storage/paths";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string;
    const displayName = ((formData.get("displayName") as string) || "").trim() || file?.name;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!folderId) return NextResponse.json({ error: "No folderId provided" }, { status: 400 });

    const fileName = sanitizeObjectName(displayName);
    const folderPrefix = normalizeFolderPrefix(folderId);
    const key = `${folderPrefix}${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await getMinioStorage().uploadFile(key, buffer, {
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      id: key,
      name: displayName,
      webViewLink: undefined,
      mimeType: file.type,
      size: String(buffer.length),
    });
  } catch (err) {
    console.error("Drive upload file error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
