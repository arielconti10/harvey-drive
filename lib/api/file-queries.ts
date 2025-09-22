import type { DashboardView, FileItem, FolderItem } from "@/lib/types";

export interface FilesQueryArgs {
  folderId?: string | null;
  dataroomId?: string | null;
  view: DashboardView;
  search?: string;
}

export interface FoldersQueryArgs {
  parentId?: string | null;
  dataroomId?: string | null;
  view: DashboardView;
}

const normalizeSearch = (value?: string) => value?.trim() ?? "";

const effectiveFolderId = (view: DashboardView, folderId?: string | null) =>
  view === "files" ? folderId ?? null : null;

export const buildFilesQueryKey = ({
  folderId,
  dataroomId,
  view,
  search,
}: FilesQueryArgs) => [
  "files",
  {
    folderId: effectiveFolderId(view, folderId),
    dataroomId: dataroomId ?? null,
    search: normalizeSearch(search),
    view,
  },
] as const;

export const buildFoldersQueryKey = ({
  parentId,
  dataroomId,
  view,
}: FoldersQueryArgs) => [
  "folders",
  {
    parentId: effectiveFolderId(view, parentId),
    dataroomId: dataroomId ?? null,
    view,
  },
] as const;

export const fetchFilesList = async ({
  folderId,
  dataroomId,
  view,
  search,
}: FilesQueryArgs): Promise<FileItem[]> => {
  const normalizedSearch = normalizeSearch(search);
  const effectiveFolder = effectiveFolderId(view, folderId);

  if (view === "shared") {
    const res = await fetch("/api/files/shared");
    if (!res.ok) throw new Error("Failed to fetch shared files");
    const data = await res.json();
    return data.files || [];
  }

  const params = new URLSearchParams();
  if (view === "starred") {
    params.append("view", "starred");
  } else if (effectiveFolder) {
    params.append("folderId", effectiveFolder);
  }

  if (dataroomId && view !== "starred") {
    params.append("dataroomId", dataroomId);
  }

  if (normalizedSearch) {
    params.append("search", normalizedSearch);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/files/list?${queryString}` : "/api/files/list";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch files");
  const data = await res.json();
  return data.files || [];
};

export const fetchFoldersList = async ({
  parentId,
  dataroomId,
  view,
}: FoldersQueryArgs): Promise<FolderItem[]> => {
  if (view !== "files") {
    return [];
  }

  const searchParams = new URLSearchParams();
  const effectiveParent = effectiveFolderId(view, parentId);

  if (effectiveParent) {
    searchParams.append("parentId", effectiveParent);
  }
  if (dataroomId) {
    searchParams.append("dataroomId", dataroomId);
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/folders/list?${queryString}`
    : "/api/folders/list";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch folders");
  const data = await res.json();
  return data.folders || [];
};
