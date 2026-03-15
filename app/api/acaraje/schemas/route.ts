import { NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";

export async function GET() {
  try {
    const schema = parseSchema();
    return NextResponse.json({
      models: schema.models,
      enums: schema.enums,
      datasource: schema.datasource,
      generator: schema.generator,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse schema", details: String(err) },
      { status: 500 }
    );
  }
}
