import { NextRequest, NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";
import { readSeederConfig, updateSeederConfig } from "@/lib/seeder-config";
import { isSeedableField, sanitizeFieldRule } from "@/lib/seeder/field-generators";

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
      if (!field || !isSeedableField(field)) continue;
      const sanitized = sanitizeFieldRule(field, schema, rule);
      if (sanitized) sanitizedRules[fieldName] = sanitized;
    }
    if (Object.keys(sanitizedRules).length > 0) out[modelName] = sanitizedRules;
  }

  return out;
}

export async function GET() {
  try {
    return NextResponse.json(readSeederConfig());
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Seeder.ConfigFile>;
    const parsed = parseSchema();
    const schema: Schema.SchemaData = {
      models: parsed.models.map((m) => ({
        name: m.name,
        fields: m.fields.map(toSchemaField),
        mapName: m.mapName,
        indexes: m.indexes,
      })),
      enums: parsed.enums,
      datasource: parsed.datasource,
      generator: parsed.generator,
    };

    const config = updateSeederConfig({
      optionalNullChance: body.optionalNullChance,
      models: body.models ? sanitizeConfigModels(body.models, schema) : undefined,
    });
    return NextResponse.json(config);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
