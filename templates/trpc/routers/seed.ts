import { code, imp } from "ts-poet";

const z = imp("z@zod")
const TRPCError = imp("TRPCError@@trpc/server")
const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const internalError = imp("internalError@@/server/trpc/init")
const prisma = imp("prisma@@/lib/prisma")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const readSeederConfig = imp("readSeederConfig@@/lib/seeder/config")
const updateSeederConfig = imp("updateSeederConfig@@/lib/seeder/config")
const generateFieldValue = imp("generateFieldValue@@/lib/seeder/generate-field-value")
const shouldSkipOptionalField = imp("shouldSkipOptionalField@@/lib/seeder/generate-field-value")
const isSeedableField = imp("isSeedableField@@/lib/seeder/field-generators")
const sanitizeFieldRule = imp("sanitizeFieldRule@@/lib/seeder/field-generators")
const getEnumValues = imp("getEnumValues@@/lib/enum-values")

// Mirrors templates/api/seed/route.ts and templates/api/seed/config/route.ts — keep them in sync.
export const writeSeedRouter = () => code`
/** Prisma Client exposes each model's delegate under its lowerCamel name (e.g. \`prisma.user\`
 *  for model \`User\`) regardless of the PascalCase model name used everywhere else. */
function delegateKey(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

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

export interface SeedResult {
  created: number;
  errors: string[];
}

export const seedRouter = ${router}({
  counts: ${protectedProcedure}.query(async () => {
    const counts: Record<string, number> = {};

    for (const model of ${parsedSchema}.models) {
      try {
        const delegate = (${prisma} as any)[delegateKey(model.name)];
        if (delegate) {
          counts[model.name] = await delegate.count();
        }
      } catch {
        counts[model.name] = 0;
      }
    }

    return { counts };
  }),

  run: ${protectedProcedure}
    .input(${z}.object({ modelName: ${z}.string(), count: ${z}.number().int().positive().default(5) }))
    .mutation(async ({ input }): Promise<SeedResult> => {
      const { modelName, count } = input;
      const seederConfig = ${readSeederConfig}();

      const modelDef = ${parsedSchema}.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());
      if (!modelDef) {
        throw new ${TRPCError}({ code: "NOT_FOUND", message: \`Model "\${modelName}" not found\` });
      }

      const delegate = (${prisma} as any)[delegateKey(modelDef.name)];
      if (!delegate) {
        throw new ${TRPCError}({ code: "NOT_FOUND", message: \`Prisma delegate not found for "\${modelName}"\` });
      }

      try {
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
                const relDelegate = (${prisma} as any)[delegateKey(field.type)];
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

        return { created: created.length, errors };
      } catch (err) {
        ${internalError}(err, "Failed to seed model");
      }
    }),

  config: ${protectedProcedure}.query((): Seeder.ConfigFile => {
    try {
      return ${readSeederConfig}();
    } catch (err) {
      ${internalError}(err, "Failed to read seeder config");
    }
  }),

  saveConfig: ${protectedProcedure}
    .input(${z}.custom<Partial<Seeder.ConfigFile>>((v) => typeof v === "object" && v !== null && !Array.isArray(v)))
    .mutation(({ input }): Seeder.ConfigFile => {
      try {
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
        } as Schema.SchemaData;

        return ${updateSeederConfig}({
          optionalNullChance: input.optionalNullChance,
          models: input.models ? sanitizeConfigModels(input.models, schema) : undefined,
        });
      } catch (err) {
        ${internalError}(err, "Failed to save seeder config");
      }
    }),
});
`;

export default writeSeedRouter;
