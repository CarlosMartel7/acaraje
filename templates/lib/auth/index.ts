import { code } from "ts-poet";

const body = code`
export {
  getAuthSecret,
  getAdminCredentials,
  tryGetAdminCredentials,
  tryGetAuthSecret,
} from "./config";
export { verifyAdminCredentials, assertAdminCredentialsConfigured } from "./credentials";
export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  getSession,
  type SessionPayload,
} from "./session";
export { requireAuth, requireAuthResponse, AuthError } from "./require-auth";
`

export default body
