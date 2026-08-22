import { code, imp } from "ts-poet";

const NextRequest = imp("NextRequest@next/server");
const NextResponse = imp("NextResponse@next/server");
const sanitizeInput = imp("sanitizeInput@@/lib/resolve-filters");

export const writeReadFoo = (prisma: string) => {

  const body = code`
 export async function GET(
  req: ${NextRequest},
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const record = await ${prisma}.findUnique({ where: { id } });
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

export const writeUpdateFoo = (prisma: string) => {

  const body = code`
export async function PUT(
  req: ${NextRequest},
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const sanitized = ${sanitizeInput}(body);
    const record = await ${prisma}.update({ where: { id }, data: sanitized });
    return ${NextResponse}.json(record);
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message }, { status: 500 });
  }
}
  `

  return body
}

export const writeDeleteFoo = (prisma: string) => {

  const body = code`
export async function DELETE(
  req: ${NextRequest},
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await ${prisma}.delete({ where: { id } });
    return ${NextResponse}.json({ success: true });
  } catch (err: any) {
    return ${NextResponse}.json({ error: err.message }, { status: 500 });
  }
}
  `

  return body
}
