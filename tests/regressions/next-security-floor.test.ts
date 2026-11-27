import fs from "fs";
import os from "os";
import path from "path";

import { generateConfigFiles } from "../../src/steps/generate-config-files";
import { ApiLayer } from "../../src/shared/api-layer";

// PR #7 audit, finding 4: generated apps pinned next@15.0.4, which is affected by the middleware
// authorization bypass GHSA-f82v-jwr5-mffw and by later middleware/proxy bypass and RCE
// advisories (e.g. GHSA-492v-c6pp-mqqv, GHSA-26hh-7cqf-hhc6, GHSA-6gpp-xcg3-4w24,
// GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr). 16.4.6 is the first release patched for all of
// them. Raise this floor when a new advisory lands.
const MIN_PATCHED_NEXT: [number, number, number] = [16, 4, 6];

jest.mock("@clack/prompts", () => ({ select: jest.fn() }));

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function generate(api: ApiLayer) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-regression-next-${api}-`));
  tmpDirs.push(outDir);
  generateConfigFiles("Acaraje", "postgresql", "minio", false, "admin", "password", api, outDir);
  return outDir;
}

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

describe.each(["rest", "trpc"] as const)("%s", (api) => {
  const outDir = generate(api);

  test("the generated manifest can only install a Next.js release patched for the known advisories", () => {
    const range: string = JSON.parse(fs.readFileSync(path.join(outDir, "package.json"), "utf-8")).dependencies.next;
    // An exact version or a caret range: either way its lowest installable version is what's written.
    const match = range.match(/^\^?(\d+)\.(\d+)\.(\d+)$/);
    expect(match).not.toBeNull();
    const lowest = match!.slice(1).map(Number);
    expect(compareVersions(lowest, MIN_PATCHED_NEXT)).toBeGreaterThanOrEqual(0);
  });

  test("the auth guard is a Next 16 proxy (proxy.ts exporting proxy), not the deprecated middleware file", () => {
    expect(fs.existsSync(path.join(outDir, "middleware.ts"))).toBe(false);
    const proxy = fs.readFileSync(path.join(outDir, "proxy.ts"), "utf-8");
    expect(proxy).toContain("export async function proxy(request: NextRequest)");
    expect(proxy).not.toMatch(/export (async )?function middleware\b/);
  });
});
