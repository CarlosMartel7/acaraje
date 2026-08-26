import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")

const writeRelationsRoute = () => {

  return code`
export async function GET() {
  try {
    return ${NextResponse}.json({ relations: ${parsedSchema}.relations });
  } catch (err) {
    return ${NextResponse}.json(
      { error: "Failed to parse relations", details: String(err) },
      { status: 500 }
    );
  }
}
  `

}

export default writeRelationsRoute
