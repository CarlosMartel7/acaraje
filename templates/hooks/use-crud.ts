"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiMutate } from "@/lib/query/api";
import { queryKeys } from "@/lib/query/keys";

export interface RawDriveFolder {
  id: string;
  name: string;
  parents?: string[];
  webViewLink?: string;
}

export function useDriveFolders() {
  return useQuery({
    queryKey: queryKeys.drive.folders,
    queryFn: () => apiGet<{ folders: RawDriveFolder[] }>("/api/acaraje/drive/folders"),
  });
}

export function useCreateDriveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; parentId?: string }) =>
      apiMutate<{ id: string; name: string; webViewLink?: string }>("/api/acaraje/drive/folders", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drive.folders }),
  });
}

export function useDeleteDriveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) =>
      apiMutate(`/api/acaraje/drive/folders?folderId=${encodeURIComponent(folderId)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drive.folders }),
  });
}

export function useDriveContents(prefix: string) {
  return useQuery({
    queryKey: queryKeys.drive.contents(prefix),
    queryFn: () => apiGet<Storage.FolderContentsResult>(`/api/acaraje/drive/contents?prefix=${encodeURIComponent(prefix)}`),
  });
}

export function useDeleteDriveSelection(prefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { folders: string[]; files: string[] }) =>
      apiMutate("/api/acaraje/drive/delete", { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drive.contents(prefix) }),
  });
}
