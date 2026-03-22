import { getMinioClient, getMinioStorage } from "./minio-storage";
import { getMinioConfig } from "./config";
import { normalizeFolderPrefix, sanitizeFolderSegment } from "./paths";

function parentPrefixOf(folderId: string): string | undefined {
  const trimmed = folderId.replace(/\/$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) return undefined;
  return trimmed.slice(0, idx + 1);
}

function collectFolderPrefixesFromKeys(keys: string[]): Set<string> {
  const folderSet = new Set<string>();
  for (const key of keys) {
    const parts = key.split("/").filter(Boolean);
    if (parts.length === 0) continue;
    const last = parts[parts.length - 1]!;
    if (last === ".keep") {
      for (let i = 0; i < parts.length - 1; i++) {
        folderSet.add(parts.slice(0, i + 1).join("/") + "/");
      }
    } else {
      for (let i = 0; i < parts.length - 1; i++) {
        folderSet.add(parts.slice(0, i + 1).join("/") + "/");
      }
    }
  }
  return folderSet;
}

function folderRecordsFromPrefixes(prefixes: Set<string>): Storage.MinioFolderRecord[] {
  return Array.from(prefixes).map((id) => {
    const nameWithoutSlash = id.replace(/\/$/, "");
    const name = nameWithoutSlash.includes("/") ? nameWithoutSlash.split("/").pop()! : nameWithoutSlash;
    const p = parentPrefixOf(id);
    return { id, name, parents: p ? [p] : [] };
  });
}

export async function listMinioFoldersFlat(): Promise<Storage.MinioFolderRecord[]> {
  const bucket = getMinioConfig().bucket;
  const keys: string[] = [];
  const stream = getMinioClient().listObjectsV2(bucket, "", true);
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (obj) => {
      if ("name" in obj && obj.name) keys.push(obj.name);
    });
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });
  const prefixes = collectFolderPrefixesFromKeys(keys);
  return folderRecordsFromPrefixes(prefixes);
}

export async function createMinioFolder(parentId: string | undefined, name: string): Promise<{ id: string; name: string }> {
  const segment = sanitizeFolderSegment(name);
  const parent = parentId ? normalizeFolderPrefix(parentId) : "";
  const id = `${parent}${segment}/`;
  const key = `${id}.keep`;
  await getMinioStorage().uploadFile(key, Buffer.alloc(0), { contentType: "application/octet-stream" });
  return { id, name: segment };
}

export async function deleteMinioFolderRecursive(folderId: string): Promise<void> {
  const client = getMinioClient();
  const bucket = getMinioConfig().bucket;
  const normalized = normalizeFolderPrefix(folderId);
  const objects: string[] = [];
  const stream = client.listObjectsV2(bucket, normalized, true);
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (obj) => {
      if ("name" in obj && obj.name) objects.push(obj.name);
    });
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });
  if (objects.length === 0) return;
  const batchSize = 1000;
  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = objects.slice(i, i + batchSize);
    await client.removeObjects(bucket, batch);
  }
}
