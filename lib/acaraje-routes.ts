/**
 * Base URL segment for all Acaraje UI pages. Must match `app/acaraje/...` in the App Router.
 * API routes stay at `/api/acaraje/...`.
 */
export const ACARAJE_BASE = "/acaraje" as const;

/** Build a path under `/acaraje`, e.g. `acarajePath("/dashboard")` → `/acaraje/dashboard` */
export function acarajePath(subpath: string): string {
  const p = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${ACARAJE_BASE}${p}`;
}
