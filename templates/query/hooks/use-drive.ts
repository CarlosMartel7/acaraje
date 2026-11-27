import { code, imp } from "ts-poet";

const useMutation = imp("useMutation@@tanstack/react-query")
const useQuery = imp("useQuery@@tanstack/react-query")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const apiGet = imp("apiGet@@/lib/query/api")
const apiMutate = imp("apiMutate@@/lib/query/api")
const queryKeys = imp("queryKeys@@/lib/query/keys")

export const writeUseDriveHook = () => code`
export interface RawDriveFolder {
  id: string;
  name: string;
  parents?: string[];
  webViewLink?: string;
}

export function useDriveFolders() {
  return ${useQuery}({
    queryKey: ${queryKeys}.drive.folders,
    queryFn: () => ${apiGet}<{ folders: RawDriveFolder[] }>("/api/drive/folders"),
  });
}

export function useCreateDriveFolder() {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (payload: { name: string; parentId?: string }) =>
      ${apiMutate}<{ id: string; name: string; webViewLink?: string }>("/api/drive/folders", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${queryKeys}.drive.folders }),
  });
}

export function useDeleteDriveFolder() {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (folderId: string) =>
      ${apiMutate}(\`/api/drive/folders?folderId=\${encodeURIComponent(folderId)}\`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${queryKeys}.drive.folders }),
  });
}

export function useDriveContents(prefix: string) {
  return ${useQuery}({
    queryKey: ${queryKeys}.drive.contents(prefix),
    queryFn: () => ${apiGet}<Storage.FolderContentsResult>(\`/api/drive/contents?prefix=\${encodeURIComponent(prefix)}\`),
  });
}

export function useDeleteDriveSelection(prefix: string) {
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (payload: { folders: string[]; files: string[] }) =>
      ${apiMutate}("/api/drive/delete", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${queryKeys}.drive.contents(prefix) }),
  });
}

/** Takes the FormData files-to-upload.tsx builds (file, folderId, displayName). Posted as-is
 *  rather than through apiMutate, which JSON-encodes its body. */
export function useDriveUpload() {
  return ${useMutation}({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/drive/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || \`Upload failed: \${res.status}\`);
      return data as { id: string; name: string; webViewLink?: string; mimeType: string; size: string };
    },
  });
}
`.toString({ prefix: '"use client";' });

export default writeUseDriveHook;
