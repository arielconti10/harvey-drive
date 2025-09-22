"use client";

import * as React from "react";
import {
  asyncDataLoaderFeature,
  hotkeysCoreFeature,
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
import type { FileItem, FolderItem } from "@/lib/types";
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
  onRenameFile?: (id: string, name: string) => Promise<FileItem>;
  onRenameFolder?: (id: string, name: string) => Promise<FolderItem>;
}

export function HtTreeView(props: HtTreeViewProps) {
  const dataroomId = useUiStore((s) => s.currentDataroomId);
  const currentFolderId = useUiStore((s) => s.currentFolderId);
  const setCurrentFolderId = useUiStore((s) => s.setCurrentFolderId);
  const setSelectedItemsStore = useUiStore((s) => s.setSelectedItems);
  const itemCacheRef = React.useRef(new Map<string, ItemPayload>());
  const prevSelectedItemsRef = React.useRef<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(
    null
  );
  const [renaming, setRenaming] = React.useState<
    { id: string; kind: "file" | "folder"; originalName: string }
  | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

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
        // Hydrated via getChildren; return minimal fallback until expanded
        const fallbackId = typeof id === "string" ? id : String(id);
        return {
          kind: "folder",
          id: fallbackId,
          name: String(id),
        } satisfies FolderPayload;
      },
      async getChildren(id) {
        const parentId = id === "root" ? null : (id as string);

        const foldersUrl = parentId
          ? `/api/folders/list?parentId=${parentId}${
              dataroomId ? `&dataroomId=${dataroomId}` : ""
            }`
          : `/api/folders/list${dataroomId ? `?dataroomId=${dataroomId}` : ""}`;

        const filesParams = new URLSearchParams();
        if (parentId) filesParams.append("folderId", parentId);
        if (dataroomId) filesParams.append("dataroomId", dataroomId);

        const [fr, fir] = await Promise.all([
          fetch(foldersUrl),
          fetch(`/api/files/list?${filesParams.toString()}`),
        ]);

        const foldersJson = await fr.json();
        const filesJson = await fir.json();
        const folders = (foldersJson.folders || []) as Array<{
          id: string;
          name: string;
          created_at?: string;
        }>;

        const files = (filesJson.files || []) as Array<FileItem>;
        const childrenIds: string[] = [];
        for (const f of folders) {
          itemCacheRef.current.set(f.id, {
            kind: "folder",
            id: f.id,
            name: f.name,
            created_at: f.created_at,
          });
          childrenIds.push(f.id);
        }
        for (const f of files) {
          itemCacheRef.current.set(f.id, {
            kind: "file",
            id: f.id,
            name: f.name,
            file: f,
          });
          childrenIds.push(f.id);
        }
        return childrenIds;
      },
    },
    features: [asyncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
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

  const startRename = React.useCallback(
    (id: string, kind: "file" | "folder", currentName: string) => {
      setRenaming({ id, kind, originalName: currentName });
      setRenameValue(currentName);
    },
    []
  );

  const cancelRename = React.useCallback(() => {
    setRenaming(null);
    setRenameValue("");
  }, []);

  const submitRename = React.useCallback(async () => {
    if (!renaming) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renaming.originalName) {
      cancelRename();
      return;
    }

    try {
      if (renaming.kind === "file") {
        if (!props.onRenameFile) {
          cancelRename();
          return;
        }
        const updated = await props.onRenameFile(renaming.id, trimmed);
        itemCacheRef.current.set(updated.id, {
          kind: "file",
          id: updated.id,
          name: updated.name,
          file: updated,
        });
      } else {
        if (!props.onRenameFolder) {
          cancelRename();
          return;
        }
        const updated = await props.onRenameFolder(renaming.id, trimmed);
        itemCacheRef.current.set(updated.id, {
          kind: "folder",
          id: updated.id,
          name: updated.name,
          created_at: updated.created_at,
        });
      }
      toast.success("Renamed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rename failed";
      toast.error(message);
    } finally {
      cancelRename();
    }
  }, [cancelRename, renaming, renameValue, props.onRenameFile, props.onRenameFolder]);

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
        const itemIdForRename = isFolder ? folderId ?? "" : String(data.id);
        const isRenaming = renaming?.id === itemIdForRename;
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
              {isRenaming ? (
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={submitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename();
                    if (event.key === "Escape") cancelRename();
                  }}
                  autoFocus
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
                      onClick={guardMenuAction(() =>
                        startRename(
                          itemIdForRename,
                          isFolder ? "folder" : "file",
                          data.name
                        )
                      )}
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
