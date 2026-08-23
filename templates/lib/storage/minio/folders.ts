import { code } from "ts-poet";

export const writeMinioFolders = () => code`
import { getMinioClient, getMinioStorage } from "./storage";
import { getMinioConfig } from "./config";
import {
  normalizeFolderPrefix,
  sanitizeFolderSegment,
  collectFolderPrefixesFromKeys,
  folderRecordsFromPrefixes,
} from "./paths";

export async function listMinioFoldersFlat(): Promise<Storage.FolderRecord[]> {
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
  const id = parent + segment + "/";
  const key = id + ".keep";
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
`;

export default writeMinioFolders;
