import fs from "fs";
import path from "path";
import folderStructure from "./folder-structure.json";

interface FolderNode {
  name: string;
  subfolders?: FolderNode[];
}

const PROJECT_NAME_TOKEN = "[PROJECT_NAME]";
// Both spellings expand to one sibling folder per schema.models[x].name — [QUERY_MODEL] is the
// one currently used in folder-structure.json, [MODEL_NAME] is kept as an alias for any node
// that needs the same per-model expansion elsewhere in the tree.
const MODEL_NAME_TOKENS = new Set(["[MODEL_NAME]", "[QUERY_MODEL]"]);

// A static import (not a runtime fs.readFileSync(__dirname, ...)) so bundlers inline the JSON
// directly into the output — __dirname doesn't exist in the ESM bundle tsup produces, and even
// shimming it wouldn't help since tsup never copies loose JSON files into dist/.
function readFolderStructure(): FolderNode[] {
  return folderStructure as FolderNode[];
}

export function sanitizeProjectName(name: string): string {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!sanitized) {
    throw new Error(`Invalid project name "${name}": must contain at least one alphanumeric character`);
  }

  return sanitized;
}

function resolveNames(nodeName: string, projectName: string, modelNames: string[]): string[] {
  if (nodeName === PROJECT_NAME_TOKEN) return [projectName];
  if (MODEL_NAME_TOKENS.has(nodeName)) return modelNames;
  return [nodeName];
}

function buildNode(
  node: FolderNode,
  parentDir: string,
  projectName: string,
  modelNames: string[],
): void {
  for (const name of resolveNames(node.name, projectName, modelNames)) {
    const dir = path.join(parentDir, name);
    fs.mkdirSync(dir, { recursive: true });

    for (const child of node.subfolders ?? []) {
      buildNode(child, dir, projectName, modelNames);
    }
  }
}

export function createFolderStructure(
  name: string,
  schema: PrismaSchema.ParsedSchema,
  baseDir: string = process.cwd(),
): void {
  const projectName = sanitizeProjectName(name);
  const modelNames = schema.models.map((m) => m.name);
  const structure = readFolderStructure();

  for (const node of structure) {
    buildNode(node, baseDir, projectName, modelNames);
  }
}
