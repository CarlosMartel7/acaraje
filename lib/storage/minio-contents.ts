import { getMinioClient } from "./minio-storage";
import { getMinioConfig } from "./config";

export async function listFolderContents(
  prefix: string,
): Promise<Storage.FolderContentsResult> {
  const client = getMinioClient();
  const bucket = getMinioConfig().bucket;
  const normalizedPrefix = prefix.endsWith("/") ? prefix : prefix ? `${prefix}/` : "";

  const folders: Storage.FolderEntry[] = [];
  const files: Storage.FileEntry[] = [];

  const stream = client.listObjectsV2(bucket, normalizedPrefix, false);

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (obj: { name?: string; prefix?: string; size?: number; lastModified?: Date }) => {
      if ("prefix" in obj && obj.prefix) {
        const fullId = obj.prefix;
        const name = fullId.replace(/\/$/, "").split("/").pop() ?? fullId;
        folders.push({ id: fullId, name });
      } else if ("name" in obj && obj.name) {
        const key = obj.name;
        if (key.endsWith("/")) return;
        const name = key.split("/").pop() ?? key;
        if (name === ".keep") return;
        files.push({
          key,
          name,
          size: obj.size ?? 0,
          lastModified: obj.lastModified ?? new Date(0),
        });
      }
    });
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });

  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return { folders, files };
}
