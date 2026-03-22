import { NextRequest, NextResponse } from "next/server";
import { listFolderContents } from "@/lib/storage/minio-contents";

export async function GET(request: NextRequest) {
  try {
    const prefix = request.nextUrl.searchParams.get("prefix") ?? "";
    const { folders, files } = await listFolderContents(prefix);
    return NextResponse.json({ folders, files });
  } catch (err) {
    console.error("Drive list contents error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list contents" },
      { status: 500 }
    );
  }
}
