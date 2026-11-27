import { code, imp } from "ts-poet";

const useMutation = imp("useMutation@@tanstack/react-query")
const useQuery = imp("useQuery@@tanstack/react-query")
const useQueryClient = imp("useQueryClient@@tanstack/react-query")
const useTRPC = imp("useTRPC@@/lib/trpc/client")
const useTRPCClient = imp("useTRPCClient@@/lib/trpc/client")

// tRPC flavor of templates/query/hooks/use-drive.ts — same exports, same return shapes.
export const writeTrpcUseDriveHook = () => code`
export interface RawDriveFolder {
  id: string;
  name: string;
  parents?: string[];
  webViewLink?: string;
}

export function useDriveFolders() {
  const trpc = ${useTRPC}();
  return ${useQuery}(trpc.drive.folders.queryOptions());
}

export function useCreateDriveFolder() {
  const trpc = ${useTRPC}();
  const queryClient = ${useQueryClient}();
  return ${useMutation}(
    trpc.drive.createFolder.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.drive.folders.queryFilter()),
    }),
  );
}

export function useDeleteDriveFolder() {
  const trpcClient = ${useTRPCClient}();
  const trpc = ${useTRPC}();
  const queryClient = ${useQueryClient}();
  return ${useMutation}({
    mutationFn: (folderId: string) => trpcClient.drive.deleteFolder.mutate({ folderId }),
    onSuccess: () => queryClient.invalidateQueries(trpc.drive.folders.queryFilter()),
  });
}

export function useDriveContents(prefix: string) {
  const trpc = ${useTRPC}();
  // Same typing as the REST hook: lastModified is declared a Date in Storage.FileEntry, though it
  // arrives as an ISO string over JSON in both flavors.
  return ${useQuery}(
    trpc.drive.contents.queryOptions({ prefix }, { select: (data) => data as unknown as Storage.FolderContentsResult }),
  );
}

export function useDeleteDriveSelection(prefix: string) {
  const trpc = ${useTRPC}();
  const queryClient = ${useQueryClient}();
  return ${useMutation}(
    trpc.drive.deleteSelection.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(trpc.drive.contents.queryFilter({ prefix })),
    }),
  );
}

/** Takes the FormData files-to-upload.tsx builds (file, folderId, displayName). */
export function useDriveUpload() {
  const trpcClient = ${useTRPCClient}();
  return ${useMutation}({
    mutationFn: (formData: FormData) => trpcClient.drive.upload.mutate(formData),
  });
}
`.toString({ prefix: '"use client";' });

export default writeTrpcUseDriveHook;
