import { NextRequest, NextResponse } from "next/server";
import { getGoogleDriveClient } from "@/lib/google-drive";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export async function GET(request: NextRequest) {
  try {
    const parentId = request.nextUrl.searchParams.get("parentId") ?? "root";

    const drive = getGoogleDriveClient();

    const response = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
      orderBy: "name",
      fields: "files(id, name)",
    });

    const folders = (response.data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name ?? "Untitled",
      children: [] as { id: string; name: string }[],
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
    const parentId = (body.parentId as string) || "root";
    const drive = getGoogleDriveClient();

    const response = await drive.files.create({
      requestBody: {
        name,
        mimeType: FOLDER_MIME_TYPE,
        ...(parentId !== "root" && { parents: [parentId] }),
      },
      fields: "id, name, webViewLink",
    });

    // Add public view permission
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

    const drive = getGoogleDriveClient();

    await drive.files.delete({ fileId: folderId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Drive delete folder error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete folder" }, { status: 500 });
  }
}
