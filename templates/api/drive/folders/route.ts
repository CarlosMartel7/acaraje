import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server")
const NextResponse = imp("NextResponse@next/server")
const listStorageFoldersFlat = imp("listStorageFoldersFlat@@/lib/storage")
const createStorageFolder = imp("createStorageFolder@@/lib/storage")
const deleteStorageFolderRecursive = imp("deleteStorageFolderRecursive@@/lib/storage")

const writeDriveFolders = () => {

  return code`
export async function GET() {
  try {
    const records = await ${listStorageFoldersFlat}();
    const folders = records.map((f) => ({
      id: f.id,
      name: f.name,
      parents: f.parents,
      webViewLink: undefined as string | undefined,
    }));
    return ${NextResponse}.json({ folders });
  } catch (err) {
    console.error("Drive list folders error:", err);
    return ${NextResponse}.json(
      { error: err instanceof Error ? err.message : "Failed to list folders" },
      { status: 500 }
    );
  }
}

export async function POST(request: ${NextRequest}) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = (body.name as string) || "Test Folder";
    const rawParent = body.parentId as string | undefined;
    const parentId = rawParent && rawParent !== "root" ? rawParent : undefined;
    const created = await ${createStorageFolder}(parentId, name);
    return ${NextResponse}.json({
      id: created.id,
      name: created.name,
      webViewLink: undefined,
    });
  } catch (err) {
    console.error("Drive create folder error:", err);
    return ${NextResponse}.json(
      { error: err instanceof Error ? err.message : "Failed to create folder" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: ${NextRequest}) {
  try {
    const folderId = request.nextUrl.searchParams.get("folderId");
    if (!folderId) {
      return ${NextResponse}.json({ error: "Missing folderId" }, { status: 400 });
    }
    await ${deleteStorageFolderRecursive}(folderId);
    return ${NextResponse}.json({ success: true });
  } catch (err) {
    console.error("Drive delete folder error:", err);
    return ${NextResponse}.json(
      { error: err instanceof Error ? err.message : "Failed to delete folder" },
      { status: 500 }
    );
  }
}
  `

}

export default writeDriveFolders
