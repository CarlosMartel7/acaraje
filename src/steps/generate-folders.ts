import fs from "fs";
import path from "path";

interface FolderNode {
  name: string;
  subfolders?: FolderNode[];
}

const PROJECT_NAME_TOKEN = "[PROJECT_NAME]";
// Both spellings expand to one sibling folder per schema.models[x].name — [QUERY_MODEL] is the
// one currently used in folder-structure.json, [MODEL_NAME] is kept as an alias for any node
// that needs the same per-model expansion elsewhere in the tree.
const MODEL_NAME_TOKENS = new Set(["[MODEL_NAME]", "[QUERY_MODEL]"]);

function readFolderStructure(): FolderNode[] {
  const filePath = path.join(__dirname, "folder-structure.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
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
  const modelNames = schema.models.map((m) => m.name);
  const structure = readFolderStructure();

  for (const node of structure) {
    buildNode(node, baseDir, name, modelNames);
  }
}
