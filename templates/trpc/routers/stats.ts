import { code, imp } from "ts-poet";

const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const internalError = imp("internalError@@/server/trpc/init")
const parsedSchema = imp("parsedSchema@@/lib/parsed-schema")
const prisma = imp("prisma@@/lib/prisma")

// Mirrors templates/api/stats/route.ts — keep both in sync.
export const writeStatsRouter = () => code`
/** Prisma Client exposes each model's delegate under its lowerCamel name (e.g. \`prisma.user\`
 *  for model \`User\`) regardless of the PascalCase model name used everywhere else. */
function delegateKey(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

export const statsRouter = ${router}({
  get: ${protectedProcedure}.query(async (): Promise<Dashboard.DashboardStats> => {
    try {
      const totalFields = ${parsedSchema}.models.reduce((acc, m) => acc + m.fields.length, 0);
      const totalRelations = ${parsedSchema}.relations.length;
      const totalIndexes = ${parsedSchema}.models.reduce((acc, m) => acc + m.indexes.length, 0);
      const modelsWithMap = ${parsedSchema}.models.filter((m) => m.mapName).length;

      const fieldTypeDistribution: Record<string, number> = {};
      for (const model of ${parsedSchema}.models) {
        for (const field of model.fields) {
          fieldTypeDistribution[field.type] = (fieldTypeDistribution[field.type] || 0) + 1;
        }
      }

      const topFieldTypes = Object.entries(fieldTypeDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([type, count]) => ({ type, count }));

      const relationTypeCount = {
        "one-to-one": ${parsedSchema}.relations.filter((r) => r.type === "one-to-one").length,
        "one-to-many": ${parsedSchema}.relations.filter((r) => r.type === "one-to-many").length,
        "many-to-one": ${parsedSchema}.relations.filter((r) => r.type === "many-to-one").length,
        "many-to-many": ${parsedSchema}.relations.filter((r) => r.type === "many-to-many").length,
      };

      const recordCounts: Record<string, number> = {};
      for (const model of ${parsedSchema}.models) {
        try {
          const delegate = (${prisma} as any)[delegateKey(model.name)];
          recordCounts[model.name] = delegate ? await delegate.count() : 0;
        } catch {
          recordCounts[model.name] = 0;
        }
      }

      return {
        totalModels: ${parsedSchema}.models.length,
        totalEnums: ${parsedSchema}.enums.length,
        totalFields,
        totalRelations,
        totalIndexes,
        modelsWithMap,
        topFieldTypes,
        relationTypeCount,
        modelsOverview: ${parsedSchema}.models.map((m) => ({
          name: m.name,
          fieldCount: m.fields.length,
          relationCount: m.fields.filter((f) => f.isRelation).length,
          recordCount: recordCounts[m.name] ?? 0,
        })),
      } as Dashboard.DashboardStats;
    } catch (err) {
      ${internalError}(err, "Failed to fetch stats");
    }
  }),
});
`;

export default writeStatsRouter;
