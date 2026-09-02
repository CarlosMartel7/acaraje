import { code } from "ts-poet";

/**
 * @param projectName the sanitized project name (see `sanitizeProjectName` in
 * `src/steps/generate-folders.ts`) — must match the `app/<projectName>/...` folder every page
 * actually gets generated under.
 */
export const writeAcarajeRoutes = (projectName: string) => code`
/**
 * Base URL segment for all Acaraje UI pages. Must match \`app/${projectName}/...\` in the App
 * Router. API routes stay at \`/api/...\` — they aren't nested under this base.
 */
export const ACARAJE_BASE = "/${projectName}" as const;

/** Build a path under the base, e.g. \`acarajePath("/dashboard")\` → \`/${projectName}/dashboard\` */
export function acarajePath(subpath: string): string {
  const p = subpath.startsWith("/") ? subpath : \`/\${subpath}\`;
  return \`\${ACARAJE_BASE}\${p}\`;
}
`;

export default writeAcarajeRoutes;
