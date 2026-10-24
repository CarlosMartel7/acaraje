import { code, imp } from "ts-poet";

const z = imp("z@zod")
const TRPCError = imp("TRPCError@@trpc/server")
const router = imp("router@@/server/trpc/init")
const protectedProcedure = imp("protectedProcedure@@/server/trpc/init")
const internalError = imp("internalError@@/server/trpc/init")
const listFolderContents = imp("listFolderContents@@/lib/storage")
const normalizeFolderPrefix = imp("normalizeFolderPrefix@@/lib/storage")
const sanitizeObjectName = imp("sanitizeObjectName@@/lib/storage")

// Mirrors templates/api/drive/{folders,contents,delete,upload,storage-config}/route.ts — keep
// them in sync.
export const writeDriveRouter = (storage: "minio" | "gcs") => {
  const Storage = storage[0].toUpperCase() + storage.slice(1)

  const getStorage = imp(`get${Storage}Storage@@/lib/storage`)
  const listFoldersFlat = imp(`list${Storage}FoldersFlat@@/lib/storage`)
  const createFolder = imp(`create${Storage}Folder@@/lib/storage`)
  const deleteFolderRecursive = imp(`delete${Storage}FolderRecursive@@/lib/storage`)

  return code`
export const driveRouter = ${router}({
  storageConfig: ${protectedProcedure}.query(() => ({ driver: "${storage}" as const })),

  folders: ${protectedProcedure}.query(async () => {
    try {
      const records = await ${listFoldersFlat}();
      const folders = records.map((f) => ({
        id: f.id,
        name: f.name,
        parents: f.parents,
        webViewLink: undefined as string | undefined,
      }));
      return { folders };
    } catch (err) {
      ${internalError}(err, "Failed to list folders");
    }
  }),

  createFolder: ${protectedProcedure}
    .input(${z}.object({ name: ${z}.string().optional(), parentId: ${z}.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        const name = input.name || "Test Folder";
        const parentId = input.parentId && input.parentId !== "root" ? input.parentId : undefined;
        const created = await ${createFolder}(parentId, name);
        return { id: created.id, name: created.name, webViewLink: undefined as string | undefined };
      } catch (err) {
        ${internalError}(err, "Failed to create folder");
      }
    }),

  deleteFolder: ${protectedProcedure}
    .input(${z}.object({ folderId: ${z}.string().min(1, "Missing folderId") }))
    .mutation(async ({ input }) => {
      try {
        await ${deleteFolderRecursive}(input.folderId);
        return { success: true };
      } catch (err) {
        ${internalError}(err, "Failed to delete folder");
      }
    }),

  contents: ${protectedProcedure}
    .input(${z}.object({ prefix: ${z}.string().default("") }))
    .query(async ({ input }): Promise<Storage.FolderContentsResult> => {
      try {
        const { folders, files } = await ${listFolderContents}(input.prefix);
        return { folders, files } as Storage.FolderContentsResult;
      } catch (err) {
        ${internalError}(err, "Failed to list contents");
      }
    }),

  deleteSelection: ${protectedProcedure}
    .input(${z}.object({ folders: ${z}.array(${z}.string()).default([]), files: ${z}.array(${z}.string()).default([]) }))
    .mutation(async ({ input }) => {
      if (input.files.length === 0 && input.folders.length === 0) {
        throw new ${TRPCError}({ code: "BAD_REQUEST", message: "No files or folders to delete" });
      }

      try {
        const storage = ${getStorage}();
        for (const key of input.files) {
          await storage.deleteFile(key);
        }
        for (const folderId of input.folders) {
          await ${deleteFolderRecursive}(folderId);
        }
        return { success: true };
      } catch (err) {
        ${internalError}(err, "Failed to delete");
      }
    }),

  /** Multipart upload: the client sends a FormData (file, folderId, displayName), which
   *  lib/trpc/client.ts routes through a non-batching httpLink. */
  upload: ${protectedProcedure}
    .input(${z}.instanceof(FormData))
    .mutation(async ({ input }) => {
      const file = input.get("file");
      const folderId = input.get("folderId");
      if (!(file instanceof File)) throw new ${TRPCError}({ code: "BAD_REQUEST", message: "No file provided" });
      if (typeof folderId !== "string" || !folderId) {
        throw new ${TRPCError}({ code: "BAD_REQUEST", message: "No folderId provided" });
      }
      const displayName = String(input.get("displayName") ?? "").trim() || file.name;

      try {
        const fileName = ${sanitizeObjectName}(displayName);
        const folderPrefix = ${normalizeFolderPrefix}(folderId);
        const key = \`\${folderPrefix}\${fileName}\`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await ${getStorage}().uploadFile(key, buffer, {
          contentType: file.type || "application/octet-stream",
        });

        return {
          id: key,
          name: displayName,
          webViewLink: undefined as string | undefined,
          mimeType: file.type,
          size: String(buffer.length),
        };
      } catch (err) {
        ${internalError}(err, "Failed to upload file");
      }
    }),
});
  `
}

export default writeDriveRouter;
