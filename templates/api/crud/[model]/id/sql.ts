import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const sanitizeInput = imp("sanitizeInput@@/lib/resolve-filters");

export const writeReadFoo = (db: string, table: string) => {

  const body = code`
 export async function GET(
  req: ${NextRequest},
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const record = await ${db}.selectFrom("${table}").selectAll().where("id", "=", id).executeTakeFirst();
    if (!record) {
      return ${NextResponse}.json({ error: "Record not found" }, { status: 404 });
    }
    return ${NextResponse}.json(record);
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message }, { status: 500 });
  }
}
  `

  return body
}

export const writeUpdateFoo = (db: string, table: string) => {

  const body = code`
export async function PUT(
  req: ${NextRequest},
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const sanitized = ${sanitizeInput}(body);
    // .returningAll() works on Postgres and SQLite; MySQL has no RETURNING clause, so swap this
    // for a plain .execute() followed by a re-fetch on that dialect.
    const record = await ${db}
      .updateTable("${table}")
      .set(sanitized as any)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return ${NextResponse}.json(record);
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message }, { status: 500 });
  }
}
  `

  return body
}

export const writeDeleteFoo = (db: string, table: string) => {

  const body = code`
export async function DELETE(
  req: ${NextRequest},
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await ${db}.deleteFrom("${table}").where("id", "=", id).execute();
    return ${NextResponse}.json({ success: true });
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message }, { status: 500 });
  }
}
  `

  return body
}
