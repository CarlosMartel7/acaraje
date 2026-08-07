import { timingSafeEqual } from "crypto";
import { getAdminCredentials, tryGetAdminCredentials } from "./config";

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still run a compare to reduce length-leak timing differences on the happy path.
    timingSafeEqual(aBuf, Buffer.alloc(aBuf.length));
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/** Timing-safe check against ACARAJE_ADMIN_* env credentials. */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const expected = tryGetAdminCredentials();
  if (!expected) return false;

  const userOk = safeEqualString(username, expected.username);
  const passOk = safeEqualString(password, expected.password);
  return userOk && passOk;
}

export function assertAdminCredentialsConfigured(): void {
  getAdminCredentials();
}
