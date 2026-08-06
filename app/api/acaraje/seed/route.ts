import { NextRequest, NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";
import { getDelegate } from "@/lib/prisma-delegate";
import { readSeederConfig } from "@/lib/seeder-config";
import { generateFieldValue, shouldSkipOptionalField } from "@/lib/seeder/generate-field-value";
import { getEnumValues } from "@/lib/enum-values";

export async function POST(req: NextRequest) {
  try {
    const { modelName, count = 5 } = await req.json();
    const seederConfig = readSeederConfig();

    const schema = parseSchema();
    const modelDef = schema.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());

    if (!modelDef) {
      return NextResponse.json({ error: `Model "${modelName}" not found` }, { status: 404 });
    }

    const delegate = getDelegate(modelName);
    if (!delegate) {
      return NextResponse.json({ error: `Prisma delegate not found for "${modelName}"` }, { status: 404 });
    }

    const created: unknown[] = [];
    const errors: string[] = [];

    for (let i = 0; i < count; i++) {
      const data: Record<string, unknown> = {};

      for (const field of modelDef.fields) {
        if (field.isId && field.hasDefault) continue;
        if (["createdAt", "updatedAt"].includes(field.name)) continue;
        if (field.isList) continue;

        if (field.isRelation && (!field.relationFields || field.relationFields.length === 0)) continue;

        if (field.isRelation && field.relationFields && field.relationFields.length > 0) {
          try {
            const relDelegate = getDelegate(field.type);
            if (relDelegate) {
              const relRecords = await relDelegate.findMany({ take: 10 });
              if (relRecords.length > 0) {
                const relRecord = relRecords[Math.floor(Math.random() * relRecords.length)];
                for (const fkField of field.relationFields) {
                  data[fkField] = relRecord.id;
                }
              } else if (field.isRequired) {
                errors.push(`No ${field.type} records found for relation ${field.name}. Seed ${field.type} first.`);
              }
            }
          } catch {
            // ignore relation errors
          }
          continue;
        }

        const isHandledByRelation = modelDef.fields.some(
          (f) => f.isRelation && f.relationFields && f.relationFields.includes(field.name),
        );
        if (isHandledByRelation) continue;

        if (shouldSkipOptionalField(seederConfig, field.isRequired)) continue;

        const enumValues = getEnumValues(field, schema.enums);
        const value = generateFieldValue(seederConfig, modelDef.name, field.name, field.type, enumValues);
        if (value !== null && value !== undefined) {
          data[field.name] = value;
        }
      }

      try {
        const record = await delegate.create({ data });
        created.push(record);
      } catch (err: unknown) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ created: created.length, errors });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  const schema = parseSchema();
  const counts: Record<string, number> = {};

  for (const model of schema.models) {
    try {
      const delegate = getDelegate(model.name);
      if (delegate) {
        counts[model.name] = await delegate.count();
      }
    } catch {
      counts[model.name] = 0;
    }
  }

  return NextResponse.json({ counts });
}
