import fs from "fs";
import os from "os";
import path from "path";

import { generateFrontEnd } from "../src/steps/generate-front-end";
import { writeLog } from "./logger";

const ROOT_PATHS = ["layout.tsx", "page.tsx", "globals.css", "login/page.tsx"];

const PROJECT_PATHS = [
  "layout.tsx",
  "dashboard/page.tsx",
  "dashboard/loading.tsx",
  "relations/page.tsx",
  "relations/loading.tsx",
  "schemas/page.tsx",
  "schemas/loading.tsx",
  "seeder/page.tsx",
  "seeder/loading.tsx",
  "drive/page.tsx",
  "drive/loading.tsx",
  "drive/view/page.tsx",
  "drive/view/loading.tsx",
  "crud/page.tsx",
  "crud/loading.tsx",
  "crud/[model]/page.tsx",
  "crud/[model]/loading.tsx",
  "crud/[model]/[id]/page.tsx",
  "crud/[model]/[id]/loading.tsx",
  "crud/[model]/new/page.tsx",
  "crud/[model]/new/loading.tsx",
];

// Pages/loading files that render behind a <Suspense> boundary and therefore need "use client".
const CLIENT_PROJECT_PATHS = new Set([
  "schemas/page.tsx",
  "drive/page.tsx",
  "drive/view/page.tsx",
  "crud/page.tsx",
  "crud/[model]/page.tsx",
  "crud/[model]/[id]/page.tsx",
  "crud/[model]/new/page.tsx",
]);

function rootPath(outDir: string, relative: string) {
  return path.join(outDir, "app", relative);
}

function projectPath(outDir: string, projectDir: string, relative: string) {
  return path.join(outDir, "app", projectDir, relative);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-front-end-"));
generateFrontEnd("Acaraje", outDir);

const root = Object.fromEntries(
  ROOT_PATHS.map((relative) => [relative, fs.readFileSync(rootPath(outDir, relative), "utf-8")]),
) as Record<string, string>;

const project = Object.fromEntries(
  PROJECT_PATHS.map((relative) => [relative, fs.readFileSync(projectPath(outDir, "acaraje", relative), "utf-8")]),
) as Record<string, string>;

writeLog("generate-front-end", { outDir, root, project }, { output: outDir });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("writes every app/ root file and app/<project>/ file", () => {
  for (const relative of ROOT_PATHS) {
    expect(fs.existsSync(rootPath(outDir, relative))).toBe(true);
  }
  for (const relative of PROJECT_PATHS) {
    expect(fs.existsSync(projectPath(outDir, "acaraje", relative))).toBe(true);
  }
});

test("sanitizes the project name the same way createFolderStructure does", () => {
  const messyOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-front-end-messy-"));
  try {
    generateFrontEnd("My Cool Panel!", messyOutDir);
    expect(fs.existsSync(projectPath(messyOutDir, "my-cool-panel", "dashboard/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(messyOutDir, "app", "My Cool Panel!"))).toBe(false);
  } finally {
    fs.rmSync(messyOutDir, { recursive: true, force: true });
  }
});

test("root page redirects into the sanitized project name, not a hardcoded 'acaraje'", () => {
  // Regression pin: the redirect target used to be hardcoded to "/acaraje/dashboard" regardless
  // of the panel name, so a custom name landed the user on a route that was never generated.
  expect(root["page.tsx"]).toContain('redirect("/acaraje/dashboard")');

  const messyOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-front-end-redirect-"));
  try {
    generateFrontEnd("My Cool Panel!", messyOutDir);
    const page = fs.readFileSync(rootPath(messyOutDir, "page.tsx"), "utf-8");
    expect(page).toContain('redirect("/my-cool-panel/dashboard")');
  } finally {
    fs.rmSync(messyOutDir, { recursive: true, force: true });
  }
});

test("writes real rendered content, not a write function's own JS source", () => {
  // Same regression class as generate-components.ts once had: storing the write *functions* and
  // calling .toString() on them directly instead of invoking them first silently writes out each
  // function's own bundled source instead of its rendered output.
  for (const content of [...Object.values(root), ...Object.values(project)]) {
    expect(content).not.toContain("import_ts_poet");
    expect(content).not.toMatch(/^\(\)\s*=>/);
  }
});

test("root layout wires up fonts, providers, and the globals.css side-effect import", () => {
  const layout = root["layout.tsx"];
  expect(layout).toContain('import "./globals.css";');
  expect(layout).toMatch(/from "next\/font\/google"/);
  expect(layout).toContain("QueryProvider");
  expect(layout).toContain("Toaster");
});

test("globals.css renders as real, unmangled CSS", () => {
  const css = root["globals.css"];
  expect(css).toContain("@tailwind base;");
  expect(css).toContain("@layer utilities {");
  expect(css).toContain("--background:");
  expect(css).not.toContain("import_ts_poet");
});

test("project pages import their matching route content and skeleton components", () => {
  expect(project["dashboard/page.tsx"]).toMatch(/from "@\/components\/routes\/dashboard"/);
  expect(project["dashboard/loading.tsx"]).toMatch(/from "@\/components\/routes\/skeletons"/);
  expect(project["crud/[model]/[id]/page.tsx"]).toMatch(/from "@\/components\/routes\/crud\/\[model\]\/edit"/);
  expect(project["layout.tsx"]).toMatch(/from "@\/components\/sidebar"/);
  expect(project["layout.tsx"]).toMatch(/from "@\/lib\/auth"/);
});

test('only the pages rendered behind a Suspense boundary get "use client"', () => {
  for (const relative of PROJECT_PATHS) {
    const hasDirective = project[relative].startsWith('"use client";');
    expect(hasDirective).toBe(CLIENT_PROJECT_PATHS.has(relative));
  }
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const content of [...Object.values(root), ...Object.values(project)]) {
    expect(content).not.toContain("[object Object]");
  }
});

test("dprint successfully formats every generated .tsx file (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const [relative, content] of Object.entries({ ...root, ...project })) {
    if (relative.endsWith(".css")) continue;
    expect(content).not.toMatch(/from '/);
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = project["dashboard/page.tsx"];
  expect(() => generateFrontEnd("Acaraje", outDir)).not.toThrow();
  const after = fs.readFileSync(projectPath(outDir, "acaraje", "dashboard/page.tsx"), "utf-8");
  expect(after).toBe(before);
});
