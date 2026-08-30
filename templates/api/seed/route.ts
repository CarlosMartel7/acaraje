import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server")
const NextResponse = imp("NextResponse@next/server")
const prisma = imp("prisma@@/lib/prisma")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const readSeederConfig = imp("readSeederConfig@@/lib/seeder/config")
const generateFieldValue = imp("generateFieldValue@@/lib/seeder/generate-field-value")
const shouldSkipOptionalField = imp("shouldSkipOptionalField@@/lib/seeder/generate-field-value")
const getEnumValues = imp("getEnumValues@@/lib/enum-values")

const writeSeedRoute = () => {

  return code`
export async function POST(req: ${NextRequest}) {
  try {
    const { modelName, count = 5 } = await req.json();
    const seederConfig = ${readSeederConfig}();

    const modelDef = ${parsedSchema}.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());

    if (!modelDef) {
      return ${NextResponse}.json({ error: \`Model "\${modelName}" not found\` }, { status: 404 });
    }

    const delegate = ${prisma}[modelName];
    if (!delegate) {
      return ${NextResponse}.json({ error: \`Prisma delegate not found for "\${modelName}"\` }, { status: 404 });
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
            const relDelegate = ${prisma}[field.type];
            if (relDelegate) {
              const relRecords = await relDelegate.findMany({ take: 10 });
              if (relRecords.length > 0) {
                const relRecord = relRecords[Math.floor(Math.random() * relRecords.length)];
                for (const fkField of field.relationFields) {
                  data[fkField] = relRecord.id;
                }
              } else if (field.isRequired) {
                errors.push(\`No \${field.type} records found for relation \${field.name}. Seed \${field.type} first.\`);
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

        if (${shouldSkipOptionalField}(seederConfig, field.isRequired)) continue;

        const enumValues = ${getEnumValues}(field, ${parsedSchema}.enums);
        const value = ${generateFieldValue}(seederConfig, modelDef.name, field.name, field.type, enumValues);
        if (value !== null && value !== undefined) {
          data[field.name] = value;
        }
      }

      try {
        const record = await delegate.create({ data });
        created.push(record);
      } catch (err: unknown) {
        errors.push(\`Row \${i + 1}: \${err instanceof Error ? err.message : String(err)}\`);
      }
    }

    return ${NextResponse}.json({ created: created.length, errors });
  } catch (err: unknown) {
    return ${NextResponse}.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  const counts: Record<string, number> = {};

  for (const model of ${parsedSchema}.models) {
    try {
      const delegate = ${prisma}[model.name];
      if (delegate) {
        counts[model.name] = await delegate.count();
      }
    } catch {
      counts[model.name] = 0;
    }
  }

  return ${NextResponse}.json({ counts });
}
  `

}

export default writeSeedRoute
