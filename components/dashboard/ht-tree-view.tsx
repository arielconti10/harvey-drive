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
} from "lucide-react";
import type { FileItem } from "@/lib/types";
import { format } from "date-fns";
import { formatFileSize, getFileIcon, canPreview } from "@/lib/utils/file-utils";
import { useUiStore } from "@/lib/store/ui";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
}

export function HtTreeView(props: HtTreeViewProps) {
  const dataroomId = useUiStore((s) => s.currentDataroomId);
  const setCurrentFolderId = useUiStore((s) => s.setCurrentFolderId);
  const setSelectedItemsStore = useUiStore((s) => s.setSelectedItems);
  const itemCacheRef = React.useRef(new Map<string, ItemPayload>());
  const prevSelectedItemsRef = React.useRef<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(null);

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
  const { onDragOver: containerDragOver, onDrop: containerDrop, className: containerClassName, ...restContainerProps } = containerProps;

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
        const isDroppableFolder = isFolder && folderId !== null;
        const dropActive = isDroppableFolder && dragOverFolderId === folderId;
        return (
          <div
            key={item.getKey()}
            {...item.getProps()}
            className={cn(
              "group flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800",
              dropActive && "bg-accent/60"
            )}
            style={{ paddingLeft: level * 16 }}
            onDragOver={
              isDroppableFolder ? (event) => handleFolderDragOver(event, folderId!) : undefined
            }
            onDrop={
              isDroppableFolder ? (event) => handleFolderDrop(event, folderId!) : undefined
            }
            onDragLeave={
              isDroppableFolder ? (event) => handleFolderDragLeave(event, folderId!) : undefined
            }
          >
            {isFolder ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:bg-transparent hover:text-muted-foreground focus-visible:bg-transparent focus-visible:text-muted-foreground"
                onClick={() =>
                  item.isExpanded() ? item.collapse() : item.expand()
                }
                aria-label={item.isExpanded() ? "Collapse" : "Expand"}
                type="button"
              >
                {item.isExpanded() ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            {isFolder ? (
              <Folder className="h-4 w-4 text-blue-500" />
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
                  fileData?.mime_type || "application/octet-stream"
                )}
              </span>
            )}
            <button
              className="flex-1 text-left font-medium"
              onClick={() =>
                isFolder
                  ? setCurrentFolderId(data.id)
                  : fileData && canPreview(fileData.mime_type)
                  ? props.onFilePreview(fileData)
                  : undefined
              }
              draggable={!!fileData}
              onDragStart={fileData ? (event) => handleDragStart(event, fileData) : undefined}
              onDragEnd={fileData ? handleDragEnd : undefined}
              type="button"
            >
              {data.name}
            </button>
            <span className="text-xs text-gray-500">
              {isFolder
                ? data.created_at
                  ? format(new Date(data.created_at), "MMM d, yyyy")
                  : ""
                : fileData?.size
                ? formatFileSize(fileData.size)
                : ""}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {fileData && canPreview(fileData.mime_type) && (
                  <DropdownMenuItem
                    onClick={() => props.onFilePreview(fileData)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                )}
                {fileData && (
                  <DropdownMenuItem
                    onClick={() => props.onFileDownload(fileData)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() =>
                    isFolder
                      ? props.onFolderDelete(String(data.id))
                      : props.onFileDelete(String(data.id))
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
