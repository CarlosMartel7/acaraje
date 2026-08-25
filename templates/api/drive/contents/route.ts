import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server")
const NextRequest = imp("NextRequest@next/server")
const listFolderContents = imp("listFolderContents@@/lib/storage")

const writeDriveContents = () => {

  return code`
export async function GET(request: ${NextRequest}) {
  try {
    const prefix = request.nextUrl.searchParams.get("prefix") ?? "";
    const { folders, files } = await ${listFolderContents}(prefix);
    return ${NextResponse}.json({ folders, files });
  } catch (err) {
    console.error("Drive list contents error:", err);
    return ${NextResponse}.json(
      { error: err instanceof Error ? err.message : "Failed to list contents" },
      { status: 500 }
    );
  }
}
  `

}

export default writeDriveContents
