import fs from "fs";
import path from "path";

// How the generated panel's front end talks to its back end: plain Next.js REST routes consumed
// through TanStack Query, or tRPC procedures consumed through @trpc/tanstack-react-query. Either
// way the components only ever import from "@/query/hooks/*", so the flavor only changes what
// gets written behind those hooks.
export const API_LAYERS = ["rest", "trpc"] as const;
export type ApiLayer = (typeof API_LAYERS)[number];

export const isApiLayer = (value: unknown): value is ApiLayer =>
  typeof value === "string" && (API_LAYERS as readonly string[]).includes(value);

// Choices made at `acaraje init` time that later commands (`acaraje update schema`) need to
// regenerate matching code — persisted next to the generated project's package.json.
export const ACARAJE_CONFIG_FILE = "acaraje.config.json";

export type AcarajeConfig = {
  api: ApiLayer;
};

export function writeAcarajeConfig(config: AcarajeConfig, baseDir: string = process.cwd()): void {
  fs.writeFileSync(path.join(baseDir, ACARAJE_CONFIG_FILE), JSON.stringify(config, null, 2) + "\n");
}

// Projects generated before acaraje.config.json existed (or with a hand-edited/broken one) fall
// back to "rest", which is what every one of them was generated with.
export function readAcarajeConfig(baseDir: string = process.cwd()): AcarajeConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(baseDir, ACARAJE_CONFIG_FILE), "utf-8"));
    return { api: isApiLayer(raw?.api) ? raw.api : "rest" };
  } catch {
    return { api: "rest" };
  }
}
