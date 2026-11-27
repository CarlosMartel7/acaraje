import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server")
const NextResponse = imp("NextResponse@next/server")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const seedModel = imp("seedModel@@/lib/seeder/seed-model")
const seedCounts = imp("seedCounts@@/lib/seeder/seed-model")

// The REST face of lib/seeder/seed-model.ts; templates/trpc/routers/seed.ts is the tRPC one.
const writeSeedRoute = () => {

  return code`
export async function POST(req: ${NextRequest}) {
  try {
    const { modelName, count = 5 } = await req.json();

    const modelDef = ${parsedSchema}.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());

    if (!modelDef) {
      return ${NextResponse}.json({ error: \`Model "\${modelName}" not found\` }, { status: 404 });
    }

    return ${NextResponse}.json(await ${seedModel}(modelDef, count));
  } catch (err: unknown) {
    return ${NextResponse}.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  return ${NextResponse}.json({ counts: await ${seedCounts}() });
}
  `

}

export default writeSeedRoute
