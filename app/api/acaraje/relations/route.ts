import { NextResponse } from "next/server";
import { parseSchema } from "@/lib/schema-parser";

export async function GET() {
  try {
    const schema = parseSchema();
    return NextResponse.json({ relations: schema.relations });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse relations", details: String(err) },
      { status: 500 }
    );
  }
}
