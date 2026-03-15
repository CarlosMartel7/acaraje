import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/google-drive";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!folderId) return NextResponse.json({ error: "No folderId provided" }, { status: 400 });

    const drive = getGoogleDriveClient();

    // Convert File to readable stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id, name, webViewLink, mimeType, size",
    });

    // Make file publicly viewable
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return NextResponse.json({
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      mimeType: response.data.mimeType,
      size: response.data.size,
    });
  } catch (err) {
    console.error("Drive upload file error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to upload file" }, { status: 500 });
  }
}
