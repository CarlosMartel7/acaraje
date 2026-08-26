import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")

const writeSchemasRoute = () => {

  return code`
export async function GET() {
  try {
    return ${NextResponse}.json({
      models: ${parsedSchema}.models,
      enums: ${parsedSchema}.enums,
      datasource: ${parsedSchema}.datasource,
      generator: ${parsedSchema}.generator,
    });
  } catch (err) {
    return ${NextResponse}.json(
      { error: "Failed to parse schema", details: String(err) },
      { status: 500 }
    );
  }
}
  `

}

export default writeSchemasRoute
