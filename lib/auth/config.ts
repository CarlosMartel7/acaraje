/** Env-driven admin credentials — no Prisma auth models. */

export function getAuthSecret(): string {
  const secret = process.env.ACARAJE_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "ACARAJE_AUTH_SECRET is not set. Generate one with: openssl rand -base64 32",
    );
  }
  if (secret.length < 16) {
    throw new Error("ACARAJE_AUTH_SECRET must be at least 16 characters");
  }
  return secret;
}

export function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ACARAJE_ADMIN_USERNAME?.trim();
  const password = process.env.ACARAJE_ADMIN_PASSWORD;

  if (!username || password == null || password === "") {
    throw new Error(
      "ACARAJE_ADMIN_USERNAME and ACARAJE_ADMIN_PASSWORD must be set in the environment",
    );
  }

  return { username, password };
}

/** Returns null when auth env is incomplete (login should fail clearly). */
export function tryGetAdminCredentials(): { username: string; password: string } | null {
  try {
    return getAdminCredentials();
  } catch {
    return null;
  }
}

export function tryGetAuthSecret(): string | null {
  try {
    return getAuthSecret();
  } catch {
    return null;
  }
}
