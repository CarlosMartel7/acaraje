import { imp, code } from "ts-poet";

const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");

export const writeGetOptionList = (
  model: PrismaSchema.PrismaModel,
  db: string,
  table: string,
  caseInsensitive: boolean
) => {
  const labelCandidates = ["name", "title", "email", "code", "slug", "label", "storeName"];

  const field = model.fields.find((f) =>
    labelCandidates.includes(f.name)
  )?.name || null;

  const likeOp = caseInsensitive ? "ilike" : "like";

  const whereBlock = field
    ? code`
        if (search) {
          query = query.where(${JSON.stringify(field)}, ${JSON.stringify(likeOp)}, "%" + search + "%");
        }
      `
    : code`// No label field found on this model; search is a no-op`;

  const selectColumns = field ? `["id", ${JSON.stringify(field)}]` : `["id"]`;
  const labelFieldString = field ? `r.${field}` : "r.id";

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
    let query = ${db}.selectFrom("${table}").select(${selectColumns});

    ${whereBlock}

    // Fetch one extra record to know whether another page follows, without a separate count query.
    const records = await query
      .offset((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1)
      .execute();

    const hasMore = records.length > PAGE_SIZE;
    const pageRecords = records.slice(0, PAGE_SIZE);

    return ${NextResponse}.json({
      options: pageRecords.map((r: any) => ({
        value: r.id,
        label: ${labelFieldString},
      })),
      hasMore,
    });
  } catch (err: any) {
    return ${NextResponse}.json({ options: [], hasMore: false });
  }
}`

  return body
}
