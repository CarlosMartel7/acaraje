import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server")
const NextResponse = imp("NextResponse@next/server")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const readSeederConfig = imp("readSeederConfig@@/lib/seeder/config")
const updateSeederConfig = imp("updateSeederConfig@@/lib/seeder/config")
const isSeedableField = imp("isSeedableField@@/lib/seeder/field-generators")
const sanitizeFieldRule = imp("sanitizeFieldRule@@/lib/seeder/field-generators")

const writeSeedConfigRoute = () => {

  return code`
function toSchemaField(f: PrismaSchema.PrismaField): Schema.Field {
  return {
    name: f.name,
    type: f.type,
    isRequired: f.isRequired,
    isList: f.isList,
    isId: f.isId,
    isUnique: f.isUnique,
    hasDefault: f.hasDefault,
    defaultValue: f.defaultValue,
    isRelation: f.isRelation,
    relationFields: f.relationFields,
    attributes: f.attributes,
  };
}

function sanitizeConfigModels(models: Seeder.ConfigFile["models"], schema: Schema.SchemaData): Seeder.ConfigFile["models"] {
  const out: Seeder.ConfigFile["models"] = {};

  for (const [modelName, rules] of Object.entries(models ?? {})) {
    const model = schema.models.find((m) => m.name === modelName);
    if (!model) continue;

    const sanitizedRules: Seeder.ModelRules = {};
    for (const [fieldName, rule] of Object.entries(rules)) {
      const field = model.fields.find((f) => f.name === fieldName);
      if (!field || !${isSeedableField}(field)) continue;
      const sanitized = ${sanitizeFieldRule}(field, schema, rule);
      if (sanitized) sanitizedRules[fieldName] = sanitized;
    }
    if (Object.keys(sanitizedRules).length > 0) out[modelName] = sanitizedRules;
  }

  return out;
}

export async function GET() {
  try {
    return ${NextResponse}.json(${readSeederConfig}());
  } catch (err: unknown) {
    return ${NextResponse}.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PUT(req: ${NextRequest}) {
  try {
    const body = (await req.json()) as Partial<Seeder.ConfigFile>;
    const schema: Schema.SchemaData = {
      models: ${parsedSchema}.models.map((m) => ({
        name: m.name,
        fields: m.fields.map(toSchemaField),
        mapName: m.mapName,
        indexes: m.indexes,
      })),
      enums: ${parsedSchema}.enums,
      datasource: ${parsedSchema}.datasource,
      generator: ${parsedSchema}.generator,
    };

    const config = ${updateSeederConfig}({
      optionalNullChance: body.optionalNullChance,
      models: body.models ? sanitizeConfigModels(body.models, schema) : undefined,
    });
    return ${NextResponse}.json(config);
  } catch (err: unknown) {
    return ${NextResponse}.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
  `

}

export default writeSeedConfigRoute
