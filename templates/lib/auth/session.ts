import { code, imp } from "ts-poet";

const cookies = imp("cookies@next/headers");
const SESSION_COOKIE = imp("SESSION_COOKIE@@/session-token");
const verifySessionToken = imp("verifySessionToken@@/session-token");
const SessionPayload = imp("SessionPayload@@/session-token");

const body = code`
export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  type SessionPayload,
} from "./session-token";

/** Server Components / Route Handlers — read session from Next cookies(). */
export async function getSession(): Promise<${SessionPayload} | null> {
  const jar = await ${cookies}();
  return ${verifySessionToken}(jar.get(${SESSION_COOKIE})?.value);
}
`;

export default body;
