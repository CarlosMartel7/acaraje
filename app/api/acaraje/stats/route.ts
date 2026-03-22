import { NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";
import { prisma } from "@/lib/prisma";

function getDelegate(modelName: string): { count: () => Promise<number> } | null {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as any)[key] ?? null;
}

export async function GET() {
  try {
    const schema = parseSchema();

    const totalFields = schema.models.reduce((acc, m) => acc + m.fields.length, 0);
    const totalRelations = schema.relations.length;
    const totalIndexes = schema.models.reduce((acc, m) => acc + m.indexes.length, 0);
    const modelsWithMap = schema.models.filter((m) => m.mapName).length;

    const fieldTypeDistribution: Record<string, number> = {};
    for (const model of schema.models) {
      for (const field of model.fields) {
        fieldTypeDistribution[field.type] = (fieldTypeDistribution[field.type] || 0) + 1;
      }
    }

    const topFieldTypes = Object.entries(fieldTypeDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const relationTypeCount = {
      "one-to-one": schema.relations.filter((r) => r.type === "one-to-one").length,
      "one-to-many": schema.relations.filter((r) => r.type === "one-to-many").length,
      "many-to-one": schema.relations.filter((r) => r.type === "many-to-one").length,
      "many-to-many": schema.relations.filter((r) => r.type === "many-to-many").length,
    };

    const recordCounts: Record<string, number> = {};
    for (const model of schema.models) {
      try {
        const delegate = getDelegate(model.name);
        recordCounts[model.name] = delegate ? await delegate.count() : 0;
      } catch {
        recordCounts[model.name] = 0;
      }
    }

    return NextResponse.json({
      totalModels: schema.models.length,
      totalEnums: schema.enums.length,
      totalFields,
      totalRelations,
      totalIndexes,
      modelsWithMap,
      topFieldTypes,
      relationTypeCount,
      modelsOverview: schema.models.map((m) => ({
        name: m.name,
        fieldCount: m.fields.length,
        relationCount: m.fields.filter((f) => f.isRelation).length,
        recordCount: recordCounts[m.name] ?? 0,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stats", details: String(err) }, { status: 500 });
  }
}
