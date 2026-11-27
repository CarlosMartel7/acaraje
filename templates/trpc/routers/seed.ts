import { code, imp } from "ts-poet";

const z = imp("z@zod")
const TRPCError = imp("TRPCError@@trpc/server")
const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const internalError = imp("internalError@@/server/trpc/init")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const readSeederConfig = imp("readSeederConfig@@/lib/seeder/config")
const updateSeederConfig = imp("updateSeederConfig@@/lib/seeder/config")
const isSeedableField = imp("isSeedableField@@/lib/seeder/field-generators")
const sanitizeFieldRule = imp("sanitizeFieldRule@@/lib/seeder/field-generators")
const seedModel = imp("seedModel@@/lib/seeder/seed-model")
const seedCounts = imp("seedCounts@@/lib/seeder/seed-model")
const SeedResult = imp("t:SeedResult@@/lib/seeder/seed-model")

// The tRPC face of lib/seeder/seed-model.ts. Mirrors templates/api/seed/config/route.ts for the
// seeder config — keep those in sync.
export const writeSeedRouter = () => code`
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

export const seedRouter = ${router}({
  counts: ${protectedProcedure}.query(async () => ({ counts: await ${seedCounts}() })),

  run: ${protectedProcedure}
    .input(${z}.object({ modelName: ${z}.string(), count: ${z}.number().int().positive().default(5) }))
    .mutation(async ({ input }): Promise<${SeedResult}> => {
      const { modelName, count } = input;

      const modelDef = ${parsedSchema}.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());
      if (!modelDef) {
        throw new ${TRPCError}({ code: "NOT_FOUND", message: \`Model "\${modelName}" not found\` });
      }

      try {
        return await ${seedModel}(modelDef, count);
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
