import { code, imp } from "ts-poet";

const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const countRecords = imp("countRecords@@/lib/model-store")
const sampleRecords = imp("sampleRecords@@/lib/model-store")
const createRecord = imp("createRecord@@/lib/model-store")
const readSeederConfig = imp("readSeederConfig@@/lib/seeder/config")
const generateFieldValue = imp("generateFieldValue@@/lib/seeder/generate-field-value")
const shouldSkipOptionalField = imp("shouldSkipOptionalField@@/lib/seeder/generate-field-value")
const getEnumValues = imp("getEnumValues@@/lib/enum-values")

/**
 * "@/lib/seeder/seed-model": the seeding logic shared by the REST seed route and the tRPC seed
 * router. It goes through "@/lib/model-store", so it works for Prisma and pure-SQL projects alike.
 */
export const writeSeedModel = () => code`
export interface SeedResult {
  created: number;
  errors: string[];
}

/** The model a relation field points at. Prisma relation fields carry the target model as their
 *  type; a pure-SQL foreign-key column's type is its column type (e.g. INTEGER), so the target
 *  comes from the parsed relations. */
function relationTarget(modelName: string, field: PrismaSchema.PrismaField): string {
  const relation = ${parsedSchema}.relations.find((r) => r.from === modelName && r.fromField === field.name);
  return relation?.to ?? field.type;
}

/** Inserts \`count\` generated rows into \`modelDef\`, collecting per-row errors instead of stopping. */
export async function seedModel(modelDef: PrismaSchema.PrismaModel, count: number): Promise<SeedResult> {
  const seederConfig = ${readSeederConfig}();
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const data: Record<string, unknown> = {};

    for (const field of modelDef.fields) {
      if (field.isId && field.hasDefault) continue;
      if (["createdAt", "updatedAt"].includes(field.name)) continue;
      if (field.isList) continue;

      if (field.isRelation && (!field.relationFields || field.relationFields.length === 0)) continue;

      if (field.isRelation && field.relationFields && field.relationFields.length > 0) {
        const target = relationTarget(modelDef.name, field);
        try {
          const relRecords = await ${sampleRecords}(target, 10);
          if (relRecords.length > 0) {
            const relRecord = relRecords[Math.floor(Math.random() * relRecords.length)];
            for (const fkField of field.relationFields) {
              data[fkField] = relRecord.id;
            }
          } else if (field.isRequired) {
            errors.push(\`No \${target} records found for relation \${field.name}. Seed \${target} first.\`);
          }
        } catch (err: unknown) {
          errors.push(\`Could not read \${target} records for relation \${field.name}: \${err instanceof Error ? err.message : String(err)}\`);
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
      await ${createRecord}(modelDef.name, data);
      created++;
    } catch (err: unknown) {
      errors.push(\`Row \${i + 1}: \${err instanceof Error ? err.message : String(err)}\`);
    }
  }

  return { created, errors };
}

/** Row count per model. A model whose count fails is reported as 0. */
export async function seedCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const model of ${parsedSchema}.models) {
    try {
      counts[model.name] = await ${countRecords}(model.name);
    } catch {
      counts[model.name] = 0;
    }
  }
  return counts;
}
`;

export default writeSeedModel;
