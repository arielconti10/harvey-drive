"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileItem, FolderItem } from "@/lib/types";

export function useFiles(
  folderId?: string | null,
  dataroomId?: string | null,
  searchQuery?: string
) {
  const normalizedSearch = searchQuery?.trim() ?? "";
  const queryClient = useQueryClient();

  const filesKey = useMemo(
    () => [
      "files",
      {
        folderId: folderId || null,
        dataroomId: dataroomId || null,
        search: normalizedSearch,
      },
    ],
    [folderId, dataroomId, normalizedSearch]
  );
  const foldersKey = useMemo(
    () => [
      "folders",
      { parentId: folderId || null, dataroomId: dataroomId || null },
    ],
    [folderId, dataroomId]
  );

  const fetchFilesList = async (): Promise<FileItem[]> => {
    const params = new URLSearchParams();
    if (folderId) params.append("folderId", folderId);
    if (dataroomId) params.append("dataroomId", dataroomId);
    if (normalizedSearch) params.append("search", normalizedSearch);
    const res = await fetch(`/api/files/list?${params}`);
    if (!res.ok) throw new Error("Failed to fetch files");
    const data = await res.json();
    return data.files || [];
  };

  const fetchFoldersList = async (): Promise<FolderItem[]> => {
    const url = folderId
      ? `/api/folders/list?parentId=${folderId}${
          dataroomId ? `&dataroomId=${dataroomId}` : ""
        }`
      : `/api/folders/list${dataroomId ? `?dataroomId=${dataroomId}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch folders");
    const data = await res.json();
    return data.folders || [];
  };

  const filesQuery = useQuery({
    queryKey: filesKey,
    queryFn: fetchFilesList,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const foldersQuery = useQuery({
    queryKey: foldersKey,
    queryFn: fetchFoldersList,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({
      file,
      folderId,
      dataroomId,
    }: {
      file: File;
      folderId?: string | null;
      dataroomId?: string | null;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folderId", folderId);
      if (dataroomId) formData.append("dataroomId", dataroomId);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return (await response.json()) as FileItem;
    },
    onSuccess: (newFile) => {
      // Optimistically add the new file to the cache
      queryClient.setQueryData<FileItem[] | undefined>(filesKey, (prev) =>
        prev ? [newFile, ...prev] : [newFile]
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: filesKey });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }
      return fileId;
    },
    onSuccess: (fileId) => {
      queryClient.setQueryData<FileItem[] | undefined>(filesKey, (prev) =>
        prev ? prev.filter((f) => f.id !== fileId) : prev
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: filesKey });
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: string; name: string }) => {
      const response = await fetch("/api/files/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Rename failed");
      }
      return (await response.json()) as FileItem;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<FileItem[] | undefined>(filesKey, (prev) =>
        prev ? prev.map((f) => (f.id === updated.id ? updated : f)) : prev
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: filesKey });
    },
  });

  const moveFileMutation = useMutation({
    mutationFn: async ({
      fileId,
      targetFolderId,
    }: {
      fileId: string;
      targetFolderId: string | null;
    }) => {
      const response = await fetch("/api/files/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, targetFolderId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Move failed");
      }
      return (await response.json()) as FileItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKey });
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: filesKey });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({
      name,
      parentId,
    }: {
      name: string;
      parentId?: string | null;
    }) => {
      const response = await fetch("/api/folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId, dataroomId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create folder");
      }
      return (await response.json()) as FolderItem;
    },
    onSuccess: (newFolder) => {
      queryClient.setQueryData<FolderItem[] | undefined>(foldersKey, (prev) =>
        prev ? [newFolder, ...prev] : [newFolder]
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: foldersKey });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch("/api/folders/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }
      return folderId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<FolderItem[] | undefined>(foldersKey, (prev) =>
        prev ? prev.filter((f) => f.id !== deletedId) : prev
      );
      // Also refresh files as a precaution (deleted subtree may affect listing)
      queryClient.invalidateQueries({ queryKey: filesKey });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: foldersKey });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({
      folderId,
      name,
    }: {
      folderId: string;
      name: string;
    }) => {
      const response = await fetch("/api/folders/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Rename failed");
      }
      return (await response.json()) as FolderItem;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<FolderItem[] | undefined>(foldersKey, (prev) =>
        prev ? prev.map((f) => (f.id === updated.id ? updated : f)) : prev
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: foldersKey });
    },
  });

  return {
    files: filesQuery.data ?? [],
    folders: foldersQuery.data ?? [],
    loading: filesQuery.isLoading || foldersQuery.isLoading,
    error:
      (filesQuery.error as Error | undefined)?.message ||
      (foldersQuery.error as Error | undefined)?.message ||
      null,
    refetch: async () => {
      await Promise.all([filesQuery.refetch(), foldersQuery.refetch()]);
    },
    uploadFile: (
      file: File,
      currentFolderId?: string | null,
      currentDataroomId?: string | null
    ) =>
      uploadFileMutation.mutateAsync({
        file,
        folderId: currentFolderId,
        dataroomId: currentDataroomId,
      }),
    deleteFile: (fileId: string) => deleteFileMutation.mutateAsync(fileId),
    createFolder: (name: string, parentId?: string | null) =>
      createFolderMutation.mutateAsync({ name, parentId }),
    deleteFolder: (fid: string) => deleteFolderMutation.mutateAsync(fid),
    renameFile: (fileId: string, name: string) =>
      renameFileMutation.mutateAsync({ fileId, name }),
    renameFolder: (folderId: string, name: string) =>
      renameFolderMutation.mutateAsync({ folderId, name }),
    moveFile: (fileId: string, targetFolderId: string | null) =>
      moveFileMutation.mutateAsync({ fileId, targetFolderId }),
  };
}
