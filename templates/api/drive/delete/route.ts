import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server")
const NextRequest = imp("NextRequest@next/server")

const writeDriveDelete = (storage: "minio" | "gcs") => {
  const Storage = storage[0].toUpperCase() + storage.slice(1)

  const getStorage = imp(`get${Storage}Storage@@/lib/storage`)
  const deleteFolderRecursive = imp(`delete${Storage}FolderRecursive@@/lib/storage`)

  return code`
export async function POST(request: ${NextRequest}) {
  try {
    const body = await request.json().catch(() => ({}));
    const files = (body.files as string[]) ?? [];
    const folders = (body.folders as string[]) ?? [];

    if (files.length === 0 && folders.length === 0) {
      return ${NextResponse}.json({ error: "No files or folders to delete" }, { status: 400 });
    }

    const storage = ${getStorage}();

    for (const key of files) {
      await storage.deleteFile(key);
    }
    for (const folderId of folders) {
      await ${deleteFolderRecursive}(folderId);
    }

    return ${NextResponse}.json({ success: true });
  } catch (err) {
    console.error("Drive delete error:", err);
    return ${NextResponse}.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
  `

}

export default writeDriveDelete
