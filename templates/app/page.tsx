import { code, imp } from "ts-poet";

const redirect = imp("redirect@next/navigation")

/** @param projectName the sanitized project name — see `templates/lib/acaraje-routes.ts`. */
export const writeRootPage = (projectName: string) => code`
export default function RootPage() {
  ${redirect}("/${projectName}/dashboard");
}
`;

export default writeRootPage;
