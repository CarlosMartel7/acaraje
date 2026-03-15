import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSchema } from "@/lib/schema-parser";

function getDelegate(modelName: string): any {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as any)[key];
}

// Returns a short list of records for a related model to populate dropdowns
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  const { model } = await params;
  try {
    const delegate = getDelegate(model);
    if (!delegate) {
      return NextResponse.json({ options: [] });
    }

    // Pick the best label field
    const schema = parseSchema();
    const modelDef = schema.models.find(
      (m) => m.name.toLowerCase() === model.toLowerCase()
    );

    const labelCandidates = ["name", "title", "email", "code", "slug", "label", "storeName"];
    const labelField = modelDef?.fields.find((f) =>
      labelCandidates.includes(f.name)
    )?.name || null;

    const records = await delegate.findMany({
      take: 100,
      select: {
        id: true,
        ...(labelField ? { [labelField]: true } : {}),
      },
    });

    return NextResponse.json({
      options: records.map((r: any) => ({
        value: r.id,
        label: labelField ? `${r[labelField]} (${r.id.slice(0, 8)})` : r.id,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ options: [] });
  }
}
