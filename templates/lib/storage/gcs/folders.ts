import { code } from "ts-poet";

export const writeGcsFolders = () => code`
import { getGcsClient, getGcsStorage } from "./storage";
import { getGcsConfig } from "./config";
import {
  normalizeFolderPrefix,
  sanitizeFolderSegment,
  collectFolderPrefixesFromKeys,
  folderRecordsFromPrefixes,
} from "./paths";

export async function listGcsFoldersFlat(): Promise<Storage.FolderRecord[]> {
  const bucket = getGcsConfig().bucket;
  const [files] = await getGcsClient().bucket(bucket).getFiles();
  const keys = files.map((f) => f.name);
  const prefixes = collectFolderPrefixesFromKeys(keys);
  return folderRecordsFromPrefixes(prefixes);
}

export async function createGcsFolder(parentId: string | undefined, name: string): Promise<{ id: string; name: string }> {
  const segment = sanitizeFolderSegment(name);
  const parent = parentId ? normalizeFolderPrefix(parentId) : "";
  const id = parent + segment + "/";
  const key = id + ".keep";
  await getGcsStorage().uploadFile(key, Buffer.alloc(0), { contentType: "application/octet-stream" });
  return { id, name: segment };
}

export async function deleteGcsFolderRecursive(folderId: string): Promise<void> {
  const bucket = getGcsConfig().bucket;
  const normalized = normalizeFolderPrefix(folderId);
  await getGcsClient().bucket(bucket).deleteFiles({ prefix: normalized });
}
`;

export default writeGcsFolders;
