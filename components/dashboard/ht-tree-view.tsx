"use client";

import * as React from "react";
import {
  asyncDataLoaderFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import type { DashboardView, FileItem, FolderItem } from "@/lib/types";
import { format } from "date-fns";
import {
  formatFileSize,
  getFileIcon,
  canPreview,
} from "@/lib/utils/file-utils";
import { useUiStore } from "@/lib/store/ui";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildFilesQueryKey,
  buildFoldersQueryKey,
  fetchFilesList,
  fetchFoldersList,
} from "@/lib/api/file-queries";
import {
  fileSignature,
  folderSignature,
  invalidateFilesForFolder,
  invalidateFoldersForParent,
  listEquals,
  normalizeSearch,
  resolveQueryData,
} from "@/lib/api/query-helpers";

type FolderPayload = {
  kind: "folder";
  id: string | null;
  name: string;
  created_at?: string;
};

type FilePayload = {
  kind: "file";
  id: string;
  name: string;
  file: FileItem;
};

type ItemPayload = FolderPayload | FilePayload;

interface HtTreeViewProps {
  onFileDownload: (file: FileItem) => void;
  onFilePreview: (file: FileItem) => void;
  onFileShare: (file: FileItem) => void;
  onFileDelete: (fileId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onFileMove?: (fileId: string, targetFolderId: string | null) => void;
  files: FileItem[];
  folders: FolderItem[];
  searchQuery?: string;
  view?: DashboardView;
  onRenameFile?: (id: string, name: string) => Promise<FileItem>;
  onRenameFolder?: (id: string, name: string) => Promise<FolderItem>;
}

export function HtTreeView(props: HtTreeViewProps) {
  const dataroomId = useUiStore((s) => s.currentDataroomId);
  const currentFolderId = useUiStore((s) => s.currentFolderId);
  const setCurrentFolderId = useUiStore((s) => s.setCurrentFolderId);
  const setSelectedItemsStore = useUiStore((s) => s.setSelectedItems);
  const queryClient = useQueryClient();
  const treeView: DashboardView = props.view ?? "files";
  const normalizedSearch = React.useMemo(
    () => normalizeSearch(props.searchQuery),
    [props.searchQuery]
  );
  const itemCacheRef = React.useRef(new Map<string, ItemPayload>());
  const prevSelectedItemsRef = React.useRef<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    const foldersKey = buildFoldersQueryKey({
      parentId: currentFolderId ?? null,
      dataroomId,
      view: treeView,
    });
    const cachedFolders = queryClient.getQueryData<FolderItem[]>(foldersKey);
    if (!listEquals(cachedFolders, props.folders, folderSignature)) {
      queryClient.setQueryData(foldersKey, props.folders);
    }

    const filesKey = buildFilesQueryKey({
      folderId: currentFolderId ?? null,
      dataroomId,
      search: normalizedSearch,
      view: treeView,
    });
    const cachedFiles = queryClient.getQueryData<FileItem[]>(filesKey);
    if (!listEquals(cachedFiles, props.files, fileSignature)) {
      queryClient.setQueryData(filesKey, props.files);
    }
  }, [
    currentFolderId,
    dataroomId,
    props.folders,
    props.files,
    normalizedSearch,
    queryClient,
    treeView,
  ]);

  const tree = useTree<ItemPayload>({
    rootItemId: "root",
    getItemName: (item) => {
      const id = item.getId();
      const cached = itemCacheRef.current.get(String(id));
      return (cached?.name ?? item.getItemData().name) as string;
    },
    isItemFolder: (item) => {
      const id = item.getId();
      const cached = itemCacheRef.current.get(String(id));
      return (cached?.kind ?? item.getItemData().kind) === "folder";
    },
    indent: 16,
    initialState: {
      expandedItems: ["root"],
      selectedItems: [],
    },
    dataLoader: {
      async getItem(id) {
        if (id === "root") return { kind: "folder", id: null, name: "Root" };
        const cached = itemCacheRef.current.get(String(id));
        if (cached) return cached;
        const fallbackId = typeof id === "string" ? id : String(id);
        return {
          kind: "folder",
          id: fallbackId,
          name: String(id),
        } satisfies FolderPayload;
      },
      async getChildren(id) {
        const parentId = id === "root" ? null : (id as string | null);

        const folderArgs = {
          parentId,
          dataroomId,
          view: treeView,
        };
        const fileArgs = {
          folderId: parentId,
          dataroomId,
          view: treeView,
          search: normalizedSearch,
        };

        const [folders, files] = await Promise.all([
          resolveQueryData(
            queryClient,
            buildFoldersQueryKey(folderArgs),
            () => fetchFoldersList(folderArgs)
          ),
          resolveQueryData(
            queryClient,
            buildFilesQueryKey(fileArgs),
            () => fetchFilesList(fileArgs)
          ),
        ]);

        const childrenIds: string[] = [];
        for (const folder of folders) {
          itemCacheRef.current.set(folder.id, {
            kind: "folder",
            id: folder.id,
            name: folder.name,
            created_at: folder.created_at,
          });
          childrenIds.push(folder.id);
        }
        for (const file of files) {
          itemCacheRef.current.set(file.id, {
            kind: "file",
            id: file.id,
            name: file.name,
            file,
          });
          childrenIds.push(file.id);
        }
        return childrenIds;
      },
    },
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      renamingFeature,
    ],
    canRename: (itemInstance) => {
      const data = itemInstance.getItemData() as ItemPayload;
      if (data.kind === "folder") {
        if (data.id === null) {
          return false;
        }
        return Boolean(props.onRenameFolder);
      }
      if (data.kind === "file") {
        return Boolean(props.onRenameFile);
      }
      return false;
    },
    onRename: async (itemInstance, nextName) => {
      const data = itemInstance.getItemData() as ItemPayload;
      const trimmed = nextName.trim();
      if (!trimmed || trimmed === data.name) {
        return;
      }
      try {
        const targetDataroomId = dataroomId ?? null;
        if (data.kind === "file") {
          if (!props.onRenameFile) return;
          const updated = await props.onRenameFile(data.id, trimmed);
          itemCacheRef.current.set(updated.id, {
            kind: "file",
            id: updated.id,
            name: updated.name,
            file: updated,
          });
          await invalidateFilesForFolder(
            queryClient,
            treeView,
            updated.folder_id ?? null,
            targetDataroomId
          );
        } else {
          if (!props.onRenameFolder || !data.id) return;
          const updated = await props.onRenameFolder(data.id, trimmed);
          itemCacheRef.current.set(updated.id, {
            kind: "folder",
            id: updated.id,
            name: updated.name,
            created_at: updated.created_at,
          });
          const parentInstance = itemInstance.getParent?.();
          const parentIdRaw: string | null | undefined = parentInstance?.getId?.();
          const parentId = !parentIdRaw || parentIdRaw === "root" ? null : parentIdRaw;
          await invalidateFoldersForParent(
            queryClient,
            treeView,
            parentId,
            targetDataroomId
          );
        }
        toast.success("Renamed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Rename failed";
        toast.error(message);
      }
    },
  });

  const selectedItems = tree.getState().selectedItems;

  const branchSignature = React.useMemo(() => {
    const folderSignature = props.folders
      .map(
        (folder, index) =>
          `${index}:${folder.id}:${folder.name}:${folder.updated_at}`
      )
      .join("|");
    const fileSignature = props.files
      .map(
        (file, index) =>
          `${index}:${file.id}:${file.name}:${file.updated_at}`
      )
      .join("|");
    return `${folderSignature}--${fileSignature}`;
  }, [props.folders, props.files]);

  const branchStateRef = React.useRef<{
    parentId: string;
    signature: string;
  } | null>(null);

  React.useEffect(() => {
    const rootItemId = tree.getConfig().rootItemId;
    const parentItemId = currentFolderId ?? rootItemId;

    const folderPayloads = props.folders.map<FolderPayload>((folder) => ({
      kind: "folder",
      id: folder.id,
      name: folder.name,
      created_at: folder.created_at,
    }));

    const filePayloads = props.files.map<FilePayload>((file) => ({
      kind: "file",
      id: file.id,
      name: file.name,
      file,
    }));

    for (const payload of [...folderPayloads, ...filePayloads]) {
      if (!payload.id) continue;
      itemCacheRef.current.set(payload.id, payload);
      const instance = tree.getItemInstance(payload.id);
      instance?.updateCachedData(payload);
    }

    const folderIds = folderPayloads
      .map((payload) => payload.id)
      .filter((value): value is string => Boolean(value));

    const nextChildrenIds = [
      ...folderIds,
      ...filePayloads.map((payload) => payload.id),
    ];

    const nextState = {
      parentId: parentItemId,
      signature: `${parentItemId}:${branchSignature}`,
    };

    const prevState = branchStateRef.current;
    branchStateRef.current = nextState;

    if (
      !prevState ||
      prevState.parentId !== nextState.parentId ||
      prevState.signature !== nextState.signature
    ) {
      const parentInstance = tree.getItemInstance(parentItemId);
      parentInstance?.updateCachedChildrenIds(nextChildrenIds);
    }
  }, [branchSignature, currentFolderId, props.files, props.folders, tree]);

  const handleDragStart = React.useCallback(
    (event: React.DragEvent, file: FileItem) => {
      event.dataTransfer.setData("application/x-file-id", file.id);
      if (file.folder_id) {
        event.dataTransfer.setData(
          "application/x-source-folder-id",
          file.folder_id
        );
      }
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragEnd = React.useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleFolderDragOver = React.useCallback(
    (event: React.DragEvent, folderId: string) => {
      if (!props.onFileMove) return;
      if (!event.dataTransfer.types.includes("application/x-file-id")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    },
    [props]
  );

  const handleFolderDrop = React.useCallback(
    (event: React.DragEvent, folderId: string) => {
      if (!props.onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);
      void props.onFileMove(fileId, folderId);
    },
    [props]
  );

  const handleFolderDragLeave = React.useCallback(
    (event: React.DragEvent, folderId: string) => {
      const related = event.relatedTarget as Node | null;
      if (!related || !event.currentTarget.contains(related)) {
        if (dragOverFolderId === folderId) {
          setDragOverFolderId(null);
        }
      }
    },
    [dragOverFolderId]
  );

  const handleRootDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!props.onFileMove) return;
      if (!event.dataTransfer.types.includes("application/x-file-id")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverFolderId(null);
    },
    [props]
  );

  const handleRootDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!props.onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);
      void props.onFileMove(fileId, null);
    },
    [props]
  );

  const guardMenuAction = React.useCallback(
    (action: () => void) => (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    []
  );

  React.useEffect(() => {
    const currentSelected = selectedItems ?? [];
    const prev = prevSelectedItemsRef.current;
    const hasSameLength = prev.length === currentSelected.length;
    const hasSameOrder = hasSameLength
      ? prev.every((value, index) => value === currentSelected[index])
      : false;

    if (hasSameLength && hasSameOrder) {
      return;
    }

    prevSelectedItemsRef.current = [...currentSelected];
    setSelectedItemsStore(new Set(currentSelected));
  }, [selectedItems, setSelectedItemsStore]);

  const containerProps = tree.getContainerProps();
  const {
    onDragOver: containerDragOver,
    onDrop: containerDrop,
    className: containerClassName,
    ...restContainerProps
  } = containerProps;

  return (
    <div
      {...restContainerProps}
      className={cn("p-2", containerClassName)}
      onDragOver={(event) => {
        containerDragOver?.(event);
        handleRootDragOver(event);
      }}
      onDrop={(event) => {
        containerDrop?.(event);
        handleRootDrop(event);
      }}
    >
      {tree.getItems().map((item) => {
        const id = item.getId();
        const data = itemCacheRef.current.get(String(id)) ?? item.getItemData();
        const level = item.getItemMeta().level;
        const isFolder = data.kind === "folder";
        const fileData = data.kind === "file" ? data.file : null;
        const folderId = isFolder ? (data as FolderPayload).id : null;
        const isRootFolder = isFolder && folderId === null;
        const isRenaming = item.isRenaming();
        const renameInputProps = isRenaming ? item.getRenameInputProps() : null;
        const canRename = isFolder
          ? Boolean(props.onRenameFolder && folderId)
          : Boolean(props.onRenameFile && fileData);
        const isDroppableFolder = isFolder && folderId !== null;
        const dropActive = isDroppableFolder && dragOverFolderId === folderId;
        const hasMenuItems = !isRootFolder;
        const canPreviewFile =
          !!fileData && canPreview(fileData.mime_type, fileData.name);
        return (
          <div
            key={item.getKey()}
            {...item.getProps()}
            className={cn(
              "group flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-accent",
              dropActive && "bg-accent/60"
            )}
            style={{ paddingLeft: level * 16 }}
            onDragOver={
              isDroppableFolder
                ? (event) => handleFolderDragOver(event, folderId!)
                : undefined
            }
            onDrop={
              isDroppableFolder
                ? (event) => handleFolderDrop(event, folderId!)
                : undefined
            }
            onDragLeave={
              isDroppableFolder
                ? (event) => handleFolderDragLeave(event, folderId!)
                : undefined
            }
          >
            {isFolder ? (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 text-muted-foreground hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent focus-visible:text-muted-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  if (item.isExpanded()) {
                    item.collapse();
                  } else {
                    item.expand();
                  }
                }}
                aria-label={item.isExpanded() ? "Collapse" : "Expand"}
                type="button"
              >
                {item.isExpanded() ? <ChevronDown /> : <ChevronRight />}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            {isFolder ? (
              <Folder />
            ) : fileData?.mime_type?.startsWith("image/") ? (
              <div className="relative overflow-hidden rounded">
                <Image
                  src={fileData.blob_url || "/placeholder.svg"}
                  alt={fileData.name}
                  fill
                  sizes="20px"
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="text-sm">
                {getFileIcon(
                  fileData?.mime_type || "application/octet-stream",
                  fileData?.name
                )}
              </span>
            )}
            <div
              className="flex-1"
              draggable={!!fileData && !isRenaming}
              onDragStart={
                fileData && !isRenaming
                  ? (event) => handleDragStart(event, fileData)
                  : undefined
              }
              onDragEnd={fileData && !isRenaming ? handleDragEnd : undefined}
            >
              {isRenaming && renameInputProps ? (
                <Input
                  {...renameInputProps}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={(event) => {
                    event.stopPropagation();
                    tree.completeRenaming();
                  }}
                  className="h-7 text-sm"
                />
              ) : (
                <button
                  className="w-full text-left font-medium"
                  onClick={() =>
                    isFolder
                      ? setCurrentFolderId((data as FolderPayload).id ?? null)
                      : fileData && canPreviewFile
                      ? props.onFilePreview(fileData)
                      : undefined
                  }
                  type="button"
                >
                  {data.name}
                </button>
              )}
            </div>
            <span className="text-xs">
              {isFolder
                ? data.created_at
                  ? format(new Date(data.created_at), "MMM d, yyyy")
                  : ""
                : fileData?.size
                ? formatFileSize(fileData.size)
                : ""}
            </span>
            {hasMenuItems ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {canRename && !isRenaming && (
                    <DropdownMenuItem
                      onClick={guardMenuAction(() => item.startRenaming())}
                    >
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {fileData && canPreviewFile && (
                    <DropdownMenuItem
                      onClick={guardMenuAction(() =>
                        props.onFilePreview(fileData)
                      )}
                    >
                      <Eye />
                      Preview
                    </DropdownMenuItem>
                  )}
                  {fileData && (
                    <DropdownMenuItem
                      onClick={guardMenuAction(() =>
                        props.onFileDownload(fileData)
                      )}
                    >
                      <Download />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={guardMenuAction(() =>
                      isFolder && folderId
                        ? props.onFolderDelete(folderId)
                        : props.onFileDelete(String(data.id))
                    )}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="w-6" />
            )}
          </div>
        );
      })}
    </div>
  );
}
