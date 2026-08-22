import { code, imp } from "ts-poet";

const NextResponse = imp("NextResponse@next/server");
const getSession = imp("getSession@@/lib/auth");

const body = code`
export async function GET() {
  const session = await ${getSession}();
  if (!session) {
    return ${NextResponse}.json({ authenticated: false }, { status: 401 });
  }
  return ${NextResponse}.json({
    authenticated: true,
    username: session.username,
  });
}
`;

export default body;
