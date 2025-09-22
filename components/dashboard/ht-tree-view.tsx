"use client";

import * as React from "react";
import {
  asyncDataLoaderFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from "@headless-tree/core";
import type { ItemInstance, TreeInstance } from "@headless-tree/core";
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
  Share,
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
import type { QueryClient } from "@tanstack/react-query";
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

interface FolderPayload {
  kind: "folder";
  id: string | null;
  name: string;
  created_at?: string;
}

interface FilePayload {
  kind: "file";
  id: string;
  name: string;
  file: FileItem;
}

type ItemPayload = FolderPayload | FilePayload;

type TreeItem = ItemInstance<ItemPayload>;
type RenameInputProps = ReturnType<TreeItem["getRenameInputProps"]>;
type TreeItemElementProps = ReturnType<TreeItem["getProps"]>;

export interface HtTreeViewProps {
  onFileDownload: (file: FileItem) => void;
  onFilePreview: (file: FileItem) => void;
  onFileShare?: (file: FileItem) => void;
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

export function HtTreeView({
  onFileDownload,
  onFilePreview,
  onFileShare,
  onFileDelete,
  onFolderDelete,
  onFileMove,
  files,
  folders,
  searchQuery,
  view: viewProp,
  onRenameFile,
  onRenameFolder,
}: HtTreeViewProps) {
  const dataroomId = useUiStore((state) => state.currentDataroomId);
  const currentFolderId = useUiStore((state) => state.currentFolderId);
  const setCurrentFolderId = useUiStore((state) => state.setCurrentFolderId);
  const setSelectedItemsStore = useUiStore((state) => state.setSelectedItems);
  const queryClient = useQueryClient();
  const treeView: DashboardView = viewProp ?? "files";
  const normalizedSearch = React.useMemo<string | undefined>(
    () => normalizeSearch(searchQuery) ?? undefined,
    [searchQuery]
  );
  const itemCacheRef = React.useRef(new Map<string, ItemPayload>());
  const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(
    null
  );

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
        if (id === "root") {
          return { kind: "folder", id: null, name: "Root" } satisfies FolderPayload;
        }
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

        const [folderResponse, fileResponse] = await Promise.all([
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
        for (const folder of folderResponse) {
          itemCacheRef.current.set(folder.id, {
            kind: "folder",
            id: folder.id,
            name: folder.name,
            created_at: folder.created_at,
          });
          childrenIds.push(folder.id);
        }
        for (const file of fileResponse) {
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
        return Boolean(onRenameFolder);
      }
      if (data.kind === "file") {
        return Boolean(onRenameFile);
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
          if (!onRenameFile) return;
          const updated = await onRenameFile(data.id, trimmed);
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
          if (!onRenameFolder || !data.id) return;
          const updated = await onRenameFolder(data.id, trimmed);
          itemCacheRef.current.set(updated.id, {
            kind: "folder",
            id: updated.id,
            name: updated.name,
            created_at: updated.created_at,
          });
          const parentInstance = itemInstance.getParent?.();
          const parentIdRaw = parentInstance?.getId?.();
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

  useQueryCacheHydration({
    queryClient,
    dataroomId: dataroomId ?? null,
    treeView,
    currentFolderId: currentFolderId ?? null,
    normalizedSearch,
    folders,
    files,
  });

  const branchSignature = React.useMemo(
    () => createBranchSignature(folders, files),
    [folders, files]
  );

  useBranchCacheSync({
    tree,
    currentFolderId: currentFolderId ?? null,
    branchSignature,
    folders,
    files,
    itemCacheRef,
  });

  const selectedItems = tree.getState().selectedItems;
  useSelectionBridge(selectedItems, setSelectedItemsStore);

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
      if (!onFileMove) return;
      if (!event.dataTransfer.types.includes("application/x-file-id")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    },
    [onFileMove]
  );

  const handleFolderDrop = React.useCallback(
    (event: React.DragEvent, folderId: string) => {
      if (!onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);
      void onFileMove(fileId, folderId);
    },
    [onFileMove]
  );

  const handleFolderDragLeave = React.useCallback(
    (event: React.DragEvent, folderId: string) => {
      const related = event.relatedTarget as Node | null;
      if (!related || !event.currentTarget.contains(related)) {
        setDragOverFolderId((current) =>
          current === folderId ? null : current
        );
      }
    },
    []
  );

  const handleRootDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onFileMove) return;
      if (!event.dataTransfer.types.includes("application/x-file-id")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverFolderId(null);
    },
    [onFileMove]
  );

  const handleRootDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);
      void onFileMove(fileId, null);
    },
    [onFileMove]
  );

  const guardMenuAction = React.useCallback(
    (action: () => void) => (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    []
  );

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
        const meta = item.getItemMeta();
        const isFolder = data.kind === "folder";
        const folderId = isFolder ? data.id : null;
        const fileData = data.kind === "file" ? data.file : undefined;
        const isRootFolder = isFolder && folderId === null;
        const isDroppableFolder = Boolean(isFolder && folderId);
        const dropActive = isDroppableFolder && dragOverFolderId === folderId;
        const isRenaming = item.isRenaming();
        const renameInputProps = isRenaming
          ? item.getRenameInputProps()
          : undefined;
        const canRename = isFolder
          ? Boolean(onRenameFolder && folderId)
          : Boolean(onRenameFile && fileData);
        const canPreviewFile = Boolean(
          fileData && canPreview(fileData.mime_type, fileData.name)
        );
        const treeItemProps = item.getProps();

        const dragState = {
          draggable: Boolean(fileData) && !isRenaming,
          onDragStart:
            fileData && !isRenaming
              ? (event: React.DragEvent<HTMLDivElement>) =>
                  handleDragStart(event, fileData)
              : undefined,
          onDragEnd:
            fileData && !isRenaming
              ? (event: React.DragEvent<HTMLDivElement>) => {
                  handleDragEnd();
                }
              : undefined,
          onFolderDragOver: isDroppableFolder
            ? (event: React.DragEvent<HTMLDivElement>) =>
                handleFolderDragOver(event, folderId as string)
            : undefined,
          onFolderDrop: isDroppableFolder
            ? (event: React.DragEvent<HTMLDivElement>) =>
                handleFolderDrop(event, folderId as string)
            : undefined,
          onFolderDragLeave: isDroppableFolder
            ? (event: React.DragEvent<HTMLDivElement>) =>
                handleFolderDragLeave(event, folderId as string)
            : undefined,
        };

        return (
          <TreeRow
            key={item.getKey()}
            data={data}
            fileData={fileData}
            level={meta.level}
            isRootFolder={isRootFolder}
            dropActive={dropActive}
            isRenaming={isRenaming}
            renameInputProps={renameInputProps}
            canRename={canRename}
            canPreviewFile={canPreviewFile}
            treeItemProps={treeItemProps}
            isExpanded={item.isExpanded()}
            onToggleExpand={() => {
              if (item.isExpanded()) {
                item.collapse();
              } else {
                item.expand();
              }
            }}
            onFolderNavigate={setCurrentFolderId}
            onFilePreview={onFilePreview}
            onFileDownload={onFileDownload}
            onFileShare={onFileShare}
            onFileDelete={onFileDelete}
            onFolderDelete={onFolderDelete}
            onStartRenaming={() => item.startRenaming()}
            onRenameInputBlur={() => tree.completeRenaming()}
            guardMenuAction={guardMenuAction}
            dragState={dragState}
          />
        );
      })}
    </div>
  );
}

interface TreeRowProps {
  data: ItemPayload;
  fileData?: FileItem;
  level: number;
  isRootFolder: boolean;
  dropActive: boolean;
  isRenaming: boolean;
  renameInputProps?: RenameInputProps;
  canRename: boolean;
  canPreviewFile: boolean;
  treeItemProps: TreeItemElementProps;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onFolderNavigate: (folderId: string | null) => void;
  onFilePreview: (file: FileItem) => void;
  onFileDownload: (file: FileItem) => void;
  onFileShare?: (file: FileItem) => void;
  onFileDelete: (fileId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onStartRenaming: () => void;
  onRenameInputBlur: () => void;
  guardMenuAction: (action: () => void) => React.MouseEventHandler<HTMLElement>;
  dragState: {
    draggable: boolean;
    onDragStart?: React.DragEventHandler<HTMLDivElement>;
    onDragEnd?: React.DragEventHandler<HTMLDivElement>;
    onFolderDragOver?: React.DragEventHandler<HTMLDivElement>;
    onFolderDrop?: React.DragEventHandler<HTMLDivElement>;
    onFolderDragLeave?: React.DragEventHandler<HTMLDivElement>;
  };
}

function TreeRow({
  data,
  fileData,
  level,
  isRootFolder,
  dropActive,
  isRenaming,
  renameInputProps,
  canRename,
  canPreviewFile,
  treeItemProps,
  isExpanded,
  onToggleExpand,
  onFolderNavigate,
  onFilePreview,
  onFileDownload,
  onFileShare,
  onFileDelete,
  onFolderDelete,
  onStartRenaming,
  onRenameInputBlur,
  guardMenuAction,
  dragState,
}: TreeRowProps) {
  const isFolder = data.kind === "folder";
  const folderId = isFolder ? data.id : null;

  const { className: itemClassName, style: itemStyle, ...restItemProps } =
    treeItemProps;

  const rowStyle = React.useMemo<React.CSSProperties>(() => {
    const style = (itemStyle as React.CSSProperties | undefined) ?? {};
    return {
      ...style,
      paddingLeft: level * 16,
    };
  }, [itemStyle, level]);

  const handlePrimaryAction = React.useCallback(() => {
    if (isFolder) {
      onFolderNavigate(folderId ?? null);
      return;
    }
    if (fileData && canPreviewFile) {
      onFilePreview(fileData);
    }
  }, [isFolder, folderId, fileData, canPreviewFile, onFolderNavigate, onFilePreview]);

  return (
    <div
      {...restItemProps}
      className={cn(
        "group flex items-center space-x-2 rounded p-2 hover:bg-gray-100 dark:hover:bg-accent",
        dropActive && "bg-accent/60",
        itemClassName
      )}
      style={rowStyle}
      onDragOver={dragState.onFolderDragOver}
      onDrop={dragState.onFolderDrop}
      onDragLeave={dragState.onFolderDragLeave}
    >
      {isFolder ? (
        <Button
          variant="ghost"
          size="sm"
          className="p-0 text-muted-foreground hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent focus-visible:text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand();
          }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          type="button"
        >
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </Button>
      ) : (
        <div className="w-6" />
      )}

      {isFolder ? (
        <Folder />
      ) : fileData?.mime_type?.startsWith("image/") ? (
        <div className="relative h-5 w-5 overflow-hidden rounded">
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
        draggable={dragState.draggable}
        onDragStart={dragState.onDragStart}
        onDragEnd={dragState.onDragEnd}
      >
        {isRenaming && renameInputProps ? (
          <Input
            {...(renameInputProps as React.ComponentProps<typeof Input>)}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => {
              renameInputProps?.onBlur?.(event);
              event.stopPropagation();
              onRenameInputBlur();
            }}
            className={cn("h-7 text-sm", renameInputProps.className)}
          />
        ) : (
          <button
            className="w-full text-left font-medium"
            onClick={handlePrimaryAction}
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

      {isRootFolder ? (
        <div className="w-6" />
      ) : (
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
              <DropdownMenuItem onClick={guardMenuAction(onStartRenaming)}>
                <Pencil />
                Rename
              </DropdownMenuItem>
            )}
            {fileData && canPreviewFile && (
              <DropdownMenuItem
                onClick={guardMenuAction(() => onFilePreview(fileData))}
              >
                <Eye />
                Preview
              </DropdownMenuItem>
            )}
            {fileData && onFileShare && (
              <DropdownMenuItem
                onClick={guardMenuAction(() => onFileShare(fileData))}
              >
                <Share />
                Share
              </DropdownMenuItem>
            )}
            {fileData && (
              <DropdownMenuItem
                onClick={guardMenuAction(() => onFileDownload(fileData))}
              >
                <Download />
                Download
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={guardMenuAction(() =>
                isFolder && folderId
                  ? onFolderDelete(folderId)
                  : onFileDelete(String(data.id))
              )}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface QueryCacheSyncArgs {
  queryClient: QueryClient;
  dataroomId: string | null;
  treeView: DashboardView;
  currentFolderId: string | null;
  normalizedSearch: string | undefined;
  folders: FolderItem[];
  files: FileItem[];
}

function useQueryCacheHydration({
  queryClient,
  dataroomId,
  treeView,
  currentFolderId,
  normalizedSearch,
  folders,
  files,
}: QueryCacheSyncArgs) {
  React.useEffect(() => {
    const foldersKey = buildFoldersQueryKey({
      parentId: currentFolderId,
      dataroomId,
      view: treeView,
    });
    const cachedFolders = queryClient.getQueryData<FolderItem[]>(foldersKey);
    if (!listEquals(cachedFolders, folders, folderSignature)) {
      queryClient.setQueryData(foldersKey, folders);
    }

    const filesKey = buildFilesQueryKey({
      folderId: currentFolderId,
      dataroomId,
      search: normalizedSearch,
      view: treeView,
    });
    const cachedFiles = queryClient.getQueryData<FileItem[]>(filesKey);
    if (!listEquals(cachedFiles, files, fileSignature)) {
      queryClient.setQueryData(filesKey, files);
    }
  }, [
    queryClient,
    currentFolderId,
    dataroomId,
    treeView,
    normalizedSearch,
    folders,
    files,
  ]);
}

interface BranchCacheSyncArgs {
  tree: TreeInstance<ItemPayload>;
  currentFolderId: string | null;
  branchSignature: string;
  folders: FolderItem[];
  files: FileItem[];
  itemCacheRef: React.MutableRefObject<Map<string, ItemPayload>>;
}

function useBranchCacheSync({
  tree,
  currentFolderId,
  branchSignature,
  folders,
  files,
  itemCacheRef,
}: BranchCacheSyncArgs) {
  const branchStateRef = React.useRef<{
    parentId: string;
    signature: string;
  } | null>(null);

  React.useEffect(() => {
    const rootItemId = tree.getConfig().rootItemId;
    const parentItemId = currentFolderId ?? rootItemId;

    const folderPayloads = folders.map<FolderPayload>((folder) => ({
      kind: "folder",
      id: folder.id,
      name: folder.name,
      created_at: folder.created_at,
    }));

    const filePayloads = files.map<FilePayload>((file) => ({
      kind: "file",
      id: file.id,
      name: file.name,
      file,
    }));

    for (const payload of [...folderPayloads, ...filePayloads]) {
      if (!payload.id) continue;
      itemCacheRef.current.set(payload.id, payload);
      tree.getItemInstance(payload.id)?.updateCachedData(payload);
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
      tree.getItemInstance(parentItemId)?.updateCachedChildrenIds(
        nextChildrenIds
      );
    }
  }, [tree, currentFolderId, branchSignature, folders, files, itemCacheRef]);
}

function useSelectionBridge(
  selectedItems: string[] | undefined,
  setSelectedItems: (value: Set<string>) => void
) {
  const prevSelectedItemsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    const currentSelected = selectedItems ?? [];
    const prev = prevSelectedItemsRef.current;
    const hasSameLength = prev.length === currentSelected.length;
    const hasSameOrder = hasSameLength
      ? prev.every((value, index) => value === currentSelected[index])
      : false;

    if (hasSameOrder) {
      return;
    }

    prevSelectedItemsRef.current = [...currentSelected];
    setSelectedItems(new Set(currentSelected));
  }, [selectedItems, setSelectedItems]);
}

function createBranchSignature(folders: FolderItem[], files: FileItem[]) {
  const folderSignaturePart = folders
    .map(
      (folder, index) =>
        `${index}:${folder.id}:${folder.name}:${folder.updated_at}`
    )
    .join("|");
  const fileSignaturePart = files
    .map((file, index) => `${index}:${file.id}:${file.name}:${file.updated_at}`)
    .join("|");
  return `${folderSignaturePart}--${fileSignaturePart}`;
}
