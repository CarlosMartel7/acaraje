import { code } from "ts-poet";

export const writeGcsContents = () => code`
import { getGcsClient } from "./storage";
import { getGcsConfig } from "./config";

export async function listFolderContents(
  prefix: string,
): Promise<Storage.FolderContentsResult> {
  const bucket = getGcsConfig().bucket;
  const normalizedPrefix = prefix.endsWith("/") ? prefix : prefix ? prefix + "/" : "";

  const [files, , apiResponse] = await getGcsClient()
    .bucket(bucket)
    .getFiles({ prefix: normalizedPrefix, delimiter: "/", autoPaginate: false });

  const folders: Storage.FolderEntry[] = ((apiResponse?.prefixes as string[] | undefined) ?? []).map((fullId) => {
    const name = fullId.replace(/\\/$/, "").split("/").pop() ?? fullId;
    return { id: fullId, name };
  });

  const fileEntries: Storage.FileEntry[] = files
    .filter((f) => f.name !== normalizedPrefix + ".keep")
    .map((f) => {
      const name = f.name.split("/").pop() ?? f.name;
      return {
        key: f.name,
        name,
        size: Number(f.metadata.size ?? 0),
        lastModified: new Date(f.metadata.updated ?? Date.now()),
      };
    });

  folders.sort((a, b) => a.name.localeCompare(b.name));
  fileEntries.sort((a, b) => a.name.localeCompare(b.name));

  return { folders, files: fileEntries };
}
`;

export default writeGcsContents;
