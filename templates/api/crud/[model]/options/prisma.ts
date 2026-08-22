import { imp, code } from "ts-poet";
import { undefined } from "zod";

const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");

export const writeGetOptionList = (
  model: PrismaSchema.PrismaModel,
  prisma: string,
  caseInsensitive: boolean
) => {
  const labelCandidates = ["name", "title", "email", "code", "slug", "label", "storeName"];

  const field = model.fields.find((f) =>
    labelCandidates.includes(f.name)
  )?.name || null;

  const whereClause = field ?
    code`{ ${field}: { contains: search${caseInsensitive ? code`, mode: "insensitive"` : ""} } }` :
    undefined
  const queryString = field ? `${field}: true` : ""
  const labelFieldString = field ? `r.${field}` : 'r.id'

  const body = code`
// Returns a page of records for a related model to populate dropdowns, optionally filtered by
// a search term against the model's label field.

const PAGE_SIZE = 20;

export async function GET(
  req: ${NextRequest},
) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const search = searchParams.get("search")?.trim() || "";

  try {
    // Fetch one extra record to know whether another page follows, without a separate count query.
    const records = await ${prisma}.findMany({
      where: ${whereClause},
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        ${queryString},
      },
  });

  const hasMore = records.length > PAGE_SIZE;
  const pageRecords = records.slice(0, PAGE_SIZE);

return ${NextResponse}.json({
  options: pageRecords.map((r: any) => ({
    value: r.id,
    label: ${labelFieldString} 
  })),
  hasMore,
});
  } catch (err: any) {
  return ${NextResponse}.json({ options: [], hasMore: false });
}
}`

  return body
}



