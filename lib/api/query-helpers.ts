import type { QueryClient } from "@tanstack/react-query";
import type { FileItem, FolderItem } from "@/lib/types";
import {
  buildFilesQueryKey,
  buildFoldersQueryKey,
} from "@/lib/api/file-queries";

export const normalizeSearch = (value?: string) => value?.trim() ?? "";

export const listEquals = <T,>(
  current: T[] | undefined,
  next: T[],
  signature: (item: T) => string
) => {
  if (!current) return false;
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (signature(current[i]) !== signature(next[i])) {
      return false;
    }
  }
  return true;
};

export const folderSignature = (folder: FolderItem) =>
  `${folder.id}:${folder.name}:${folder.updated_at}`;

export const fileSignature = (file: FileItem) =>
  `${file.id}:${file.name}:${file.updated_at}:${file.folder_id ?? ""}`;

export const resolveQueryData = async <T,>(
  queryClient: QueryClient,
  key: ReturnType<typeof buildFilesQueryKey> | ReturnType<typeof buildFoldersQueryKey>,
  fetcher: () => Promise<T>
) => {
  const cached = queryClient.getQueryData<T>(key);
  const state = queryClient.getQueryState<T>(key);
  if (!cached || state?.isInvalidated) {
    return queryClient.fetchQuery({ queryKey: key, queryFn: fetcher });
  }
  return cached;
};

export const invalidateFilesForFolder = async (
  queryClient: QueryClient,
  view: string,
  folderId: string | null,
  dataroomId: string | null
) => {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [key, params] = query.queryKey as [unknown, Record<string, unknown>];
      if (key !== "files") {
        return false;
      }
      return (
        (params.view ?? "files") === view &&
        (params.dataroomId ?? null) === dataroomId &&
        (params.folderId ?? null) === folderId
      );
    },
  });
};

export const invalidateFoldersForParent = async (
  queryClient: QueryClient,
  view: string,
  parentId: string | null,
  dataroomId: string | null
) => {
  await queryClient.invalidateQueries({
    predicate: (query) => {
      if (!Array.isArray(query.queryKey)) return false;
      const [key, params] = query.queryKey as [unknown, Record<string, unknown>];
      if (key !== "folders") {
        return false;
      }
      return (
        (params.view ?? "files") === view &&
        (params.dataroomId ?? null) === dataroomId &&
        (params.parentId ?? null) === parentId
      );
    },
  });
};
