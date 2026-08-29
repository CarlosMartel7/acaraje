import fs from "fs";
import os from "os";
import path from "path";

import { generateComponents } from "../src/steps/generate-components";
import { writeLog } from "./logger";

const COMPONENT_PATHS = [
  "providers/query-provider.tsx",
  "routes/dashboard/[[api-calls]].tsx",
  "routes/dashboard/index.tsx",
  "routes/dashboard/models.tsx",
  "routes/dashboard/stat-cards.tsx",
  "routes/drive/[[api-calls]].tsx",
  "routes/drive/files-to-upload.tsx",
  "routes/drive/folder-tree.tsx",
  "routes/drive/index.tsx",
  "routes/drive/select-drive.tsx",
  "routes/drive/target-folder.tsx",
  "routes/drive/view/[[api-calls]].tsx",
  "routes/drive/view/folder-breadcrumbs.tsx",
  "routes/drive/view/folder-contents-table.tsx",
  "routes/drive/view/index.tsx",
  "routes/login/login-form.tsx",
  "routes/relations/[[api-calls]].tsx",
  "routes/relations/index.tsx",
  "routes/relations/relation-model-card.tsx",
  "routes/relations/relations-constants.ts",
  "routes/schemas/[[api-calls]].tsx",
  "routes/schemas/enums.tsx",
  "routes/schemas/index.tsx",
  "routes/schemas/models.tsx",
  "routes/schemas/viewer.tsx",
  "routes/seeder/[[api-calls]].tsx",
  "routes/seeder/config-panel.tsx",
  "routes/seeder/index.tsx",
  "routes/skeletons.tsx",
  "ui/button.tsx",
  "ui/card.tsx",
  "ui/checkbox.tsx",
  "ui/input.tsx",
  "ui/select.tsx",
  "ui/skeleton.tsx",
  "ui/sonner.tsx",
  "ui/table.tsx",
  "ui/tabs.tsx",
];

function componentPath(outDir: string, relative: string) {
  return path.join(outDir, "components", relative);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "acaraje-generate-components-"));
generateComponents(outDir);

const files = Object.fromEntries(
  COMPONENT_PATHS.map((relative) => [relative, fs.readFileSync(componentPath(outDir, relative), "utf-8")]),
) as Record<string, string>;

writeLog("generate-components", { outDir, files }, { output: outDir });

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

test("writes every component file under components/, mirroring templates/components/ 1:1", () => {
  for (const relative of COMPONENT_PATHS) {
    expect(fs.existsSync(componentPath(outDir, relative))).toBe(true);
  }
});

test("connection-badge.tsx and sidebar.tsx are not generated (still-empty source templates)", () => {
  expect(fs.existsSync(componentPath(outDir, "connection-badge.tsx"))).toBe(false);
  expect(fs.existsSync(componentPath(outDir, "sidebar.tsx"))).toBe(false);
});

test("writes real rendered content, not a write function's own JS source", () => {
  // Regression pin: generateComponents once stored the write *functions* in its map and called
  // .toString() on them directly instead of invoking them first, which silently wrote out each
  // function's own bundled source (e.g. "()=>import_ts_poet.code`...`") instead of its rendered
  // output. Arrow functions are legitimate content in real component logic, so this checks for
  // the bundler-specific artifact and the tell-tale unrendered-arrow-at-the-very-start shape,
  // not "=>" generally.
  for (const content of Object.values(files)) {
    expect(content).not.toContain("import_ts_poet");
    expect(content).not.toMatch(/^\(\)\s*=>/);
  }
});

test("leading directives (// @ts-nocheck, \"use client\";) land before imports, in original order", () => {
  expect(files["ui/button.tsx"]).toMatch(/^\/\/ @ts-nocheck\nimport /);
  expect(files["ui/tabs.tsx"]).toMatch(/^\/\/ @ts-nocheck\n"use client";\nimport /);
  expect(files["providers/query-provider.tsx"]).toMatch(/^"use client";\nimport /);
});

test("ui components import their real dependencies (radix, cva, cn)", () => {
  expect(files["ui/button.tsx"]).toContain("buttonVariants");
  expect(files["ui/button.tsx"]).toMatch(/from "@radix-ui\/react-slot"/);
  expect(files["ui/button.tsx"]).toMatch(/from "class-variance-authority"/);
  expect(files["ui/tabs.tsx"]).toMatch(/from "@radix-ui\/react-tabs"/);
});

test("query-provider.tsx wires up TanStack Query's client provider", () => {
  const content = files["providers/query-provider.tsx"];
  expect(content).toMatch(/from "@tanstack\/react-query"/);
  expect(content).toMatch(/from "@\/lib\/query\/client"/);
  expect(content).toContain("QueryClientProvider");
});

test("[[api-calls]] helper components call their matching hook from @/query/hooks", () => {
  expect(files["routes/dashboard/[[api-calls]].tsx"]).toMatch(/from "@\/query\/hooks\/use-stats"/);
  expect(files["routes/relations/[[api-calls]].tsx"]).toMatch(/from "@\/query\/hooks\/use-relations"/);
  expect(files["routes/schemas/[[api-calls]].tsx"]).toMatch(/from "@\/query\/hooks\/use-schemas"/);
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const content of Object.values(files)) {
    expect(content).not.toContain("[object Object]");
  }
});

test("dprint successfully formats every generated file (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const content of Object.values(files)) {
    expect(content).not.toMatch(/from '/);
  }
});

// KNOWN BUG (pre-existing in templates/components/routes/drive/select-drive.tsx): the source file
// is byte-for-byte identical to target-folder.tsx — not a real SelectDrive component. This test
// pins that regression; it'll pass once the source template is fixed.
test("select-drive.tsx is a distinct component from target-folder.tsx", () => {
  expect(files["routes/drive/select-drive.tsx"]).not.toBe(files["routes/drive/target-folder.tsx"]);
});

// KNOWN BUG (pre-existing in templates/components/routes/drive/view/index.tsx): the relative
// import to the sibling [[api-calls]].tsx file is missing its closing bracket, so it won't
// resolve. This test pins that regression; it'll pass once the source template is fixed.
test("drive/view/index.tsx imports its [[api-calls]] sibling with a resolvable path", () => {
  expect(files["routes/drive/view/index.tsx"]).toMatch(/from "\.\/\[\[api-calls\]\]"/);
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = files["ui/button.tsx"];
  expect(() => generateComponents(outDir)).not.toThrow();
  const after = fs.readFileSync(componentPath(outDir, "ui/button.tsx"), "utf-8");
  expect(after).toBe(before);
});
