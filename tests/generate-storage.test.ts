import fs from "fs";
import os from "os";
import path from "path";

import { generateStorage } from "../src/steps/generate-storage";
import { writeLog } from "./logger";

function libPath(outDir: string, file: string) {
  return path.join(outDir, "lib", "storage", file);
}

function drivePath(outDir: string, route: string) {
  return path.join(outDir, "app", "api", "drive", route, "route.ts");
}

const LIB_FILES = ["index.ts", "paths.ts", "config.ts", "storage.ts", "contents.ts", "folders.ts"];
const DRIVE_ROUTES = ["contents", "delete", "folders", "storage-config", "upload"];

function generateAndRead(storage: "minio" | "gcs") {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `acaraje-generate-storage-${storage}-`));
  generateStorage(storage, outDir);

  const lib = Object.fromEntries(
    LIB_FILES.map((file) => [file, fs.readFileSync(libPath(outDir, file), "utf-8")]),
  ) as Record<string, string>;

  const api = Object.fromEntries(
    DRIVE_ROUTES.map((route) => [route, fs.readFileSync(drivePath(outDir, route), "utf-8")]),
  ) as Record<string, string>;

  return { outDir, lib, api };
}

const minio = generateAndRead("minio");
const gcs = generateAndRead("gcs");

writeLog("generate-storage", { minio, gcs });

afterAll(() => {
  fs.rmSync(minio.outDir, { recursive: true, force: true });
  fs.rmSync(gcs.outDir, { recursive: true, force: true });
});

test("writes every lib/storage and app/api/drive file for both drivers", () => {
  for (const { outDir } of [minio, gcs]) {
    for (const file of LIB_FILES) {
      expect(fs.existsSync(libPath(outDir, file))).toBe(true);
    }
    for (const route of DRIVE_ROUTES) {
      expect(fs.existsSync(drivePath(outDir, route))).toBe(true);
    }
  }
});

test("lib/storage/index.ts aliases the driver-specific functions to the generic names", () => {
  expect(minio.lib["index.ts"]).toContain("getMinioStorage as getObjectStorage");
  expect(minio.lib["index.ts"]).toContain("deleteMinioFolderRecursive as deleteStorageFolderRecursive");
  expect(minio.lib["index.ts"]).toContain("listMinioFoldersFlat as listStorageFoldersFlat");

  expect(gcs.lib["index.ts"]).toContain("getGcsStorage as getObjectStorage");
  expect(gcs.lib["index.ts"]).toContain("deleteGcsFolderRecursive as deleteStorageFolderRecursive");
  expect(gcs.lib["index.ts"]).toContain("listGcsFoldersFlat as listStorageFoldersFlat");
});

test("api/drive routes call the driver-explicit functions directly, never the generic alias", () => {
  expect(minio.api.delete).toContain("getMinioStorage");
  expect(minio.api.delete).toContain("deleteMinioFolderRecursive");
  expect(gcs.api.delete).toContain("getGcsStorage");
  expect(gcs.api.delete).toContain("deleteGcsFolderRecursive");

  for (const api of [minio.api, gcs.api]) {
    for (const route of DRIVE_ROUTES) {
      expect(api[route]).not.toContain("getObjectStorage");
      expect(api[route]).not.toContain("deleteStorageFolderRecursive");
      expect(api[route]).not.toContain("listStorageFoldersFlat");
      expect(api[route]).not.toContain("createStorageFolder");
    }
  }
});

test("folders route uses the driver-specific list/create/delete folder functions", () => {
  expect(minio.api.folders).toContain("listMinioFoldersFlat");
  expect(minio.api.folders).toContain("createMinioFolder");
  expect(minio.api.folders).toContain("deleteMinioFolderRecursive");

  expect(gcs.api.folders).toContain("listGcsFoldersFlat");
  expect(gcs.api.folders).toContain("createGcsFolder");
  expect(gcs.api.folders).toContain("deleteGcsFolderRecursive");
});

test("upload route calls the driver-specific storage getter", () => {
  expect(minio.api.upload).toContain("getMinioStorage()");
  expect(gcs.api.upload).toContain("getGcsStorage()");
});

test("storage-config route bakes in the literal driver name", () => {
  expect(minio.api["storage-config"]).toContain('driver: "minio" as const');
  expect(gcs.api["storage-config"]).toContain('driver: "gcs" as const');
});

test("contents route is storage-agnostic and identical across drivers", () => {
  expect(minio.api.contents).toContain("listFolderContents");
  expect(minio.api.contents).not.toMatch(/Minio|Gcs/);
  expect(minio.api.contents).toBe(gcs.api.contents);
});

test("each generated file imports next/server at most once (fragments were merged, not concatenated)", () => {
  for (const api of [minio.api, gcs.api]) {
    for (const content of Object.values(api)) {
      const matches = content.match(/from "next\/server"/g) ?? [];
      expect(matches.length).toBeLessThanOrEqual(1);
    }
  }
});

test("never leaks an unresolved ts-poet import placeholder into the output", () => {
  for (const { lib, api } of [minio, gcs]) {
    for (const content of [...Object.values(lib), ...Object.values(api)]) {
      expect(content).not.toContain("[object Object]");
    }
  }
});

test("dprint successfully formats every generated file (double-quoted imports, not the raw single-quoted fallback)", () => {
  for (const { lib, api } of [minio, gcs]) {
    for (const content of [...Object.values(lib), ...Object.values(api)]) {
      expect(content).not.toMatch(/from '/);
    }
  }
});

test("is idempotent — running twice doesn't throw and produces the same output", () => {
  const before = minio.api.delete;
  expect(() => generateStorage("minio", minio.outDir)).not.toThrow();
  const after = fs.readFileSync(drivePath(minio.outDir, "delete"), "utf-8");
  expect(after).toBe(before);
});
