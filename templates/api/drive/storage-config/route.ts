import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server")

const writeDriveStorageConfig = (storage: "minio" | "gcs") => {

  return code`
export async function GET() {
  return ${NextResponse}.json({ driver: "${storage}" as const });
}
  `

}

export default writeDriveStorageConfig
