import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server")
const NextResponse = imp("NextResponse@next/server")
const normalizeFolderPrefix = imp("normalizeFolderPrefix@@/lib/storage")
const sanitizeObjectName = imp("sanitizeObjectName@@/lib/storage")

const writeDriveUpload = (storage: "minio" | "gcs") => {
  const Storage = storage[0].toUpperCase() + storage.slice(1)

  const getStorage = imp(`get${Storage}Storage@@/lib/storage`)

  return code`
export async function POST(request: ${NextRequest}) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string;
    const displayName = ((formData.get("displayName") as string) || "").trim() || file?.name;

    if (!file) return ${NextResponse}.json({ error: "No file provided" }, { status: 400 });
    if (!folderId) return ${NextResponse}.json({ error: "No folderId provided" }, { status: 400 });

    const fileName = ${sanitizeObjectName}(displayName);
    const folderPrefix = ${normalizeFolderPrefix}(folderId);
    const key = \`\${folderPrefix}\${fileName}\`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await ${getStorage}().uploadFile(key, buffer, {
      contentType: file.type || "application/octet-stream",
    });

    return ${NextResponse}.json({
      id: key,
      name: displayName,
      webViewLink: undefined,
      mimeType: file.type,
      size: String(buffer.length),
    });
  } catch (err) {
    console.error("Drive upload file error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload file";
    return ${NextResponse}.json({ error: message }, { status: 500 });
  }
}
  `

}

export default writeDriveUpload
