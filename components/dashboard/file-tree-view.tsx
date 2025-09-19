"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Download,
  Trash2,
} from "lucide-react";
import type { FileItem, FolderItem } from "@/lib/types";
import { formatFileSize, getFileIcon } from "@/lib/utils/file-utils";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useUiStore } from "@/lib/store/ui";

interface FileTreeViewProps {
  files: FileItem[];
  folders: FolderItem[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFolderOpen: (folderId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFolderDelete: (folderId: string) => void;
}

export function FileTreeView({
  files,
  folders,
  selectedItems,
  onItemSelect,
  onFolderOpen,
  onFileDelete,
  onFolderDelete,
}: FileTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const dataroomId = useUiStore((s) => s.currentDataroomId);
  const treeRootRef = useRef<HTMLDivElement>(null);

  const toggleFolder = (folderId: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    setExpandedFolders(next);
  };

  const handleDownload = (file: FileItem) => {
    window.open(file.blob_url, "_blank", "noopener,noreferrer");
  };

  function focusNextPrev(current: HTMLElement | null, direction: 1 | -1) {
    const root = treeRootRef.current;
    if (!root) return;
    const rows = Array.from(
      root.querySelectorAll<HTMLElement>("[data-tree-row='true']")
    );
    const idx = current ? rows.indexOf(current) : -1;
    const next = rows[idx + direction];
    next?.focus();
  }

  function useChildren(parentId: string) {
    const foldersQuery = useQuery({
      queryKey: [
        "tree",
        "folders",
        { parentId, dataroomId: dataroomId || null },
      ],
      queryFn: async (): Promise<FolderItem[]> => {
        const url = `/api/folders/list?parentId=${parentId}${
          dataroomId ? `&dataroomId=${dataroomId}` : ""
        }`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch folders");
        const data = await res.json();
        return data.folders || [];
      },
      enabled: expandedFolders.has(parentId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    });

    const filesQuery = useQuery({
      queryKey: ["tree", "files", { parentId, dataroomId: dataroomId || null }],
      queryFn: async (): Promise<FileItem[]> => {
        const params = new URLSearchParams();
        params.append("folderId", parentId);
        if (dataroomId) params.append("dataroomId", dataroomId);
        const res = await fetch(`/api/files/list?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch files");
        const data = await res.json();
        return data.files || [];
      },
      enabled: expandedFolders.has(parentId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    });

    return {
      childFolders: foldersQuery.data || [],
      childFiles: filesQuery.data || [],
      loading: foldersQuery.isLoading || filesQuery.isLoading,
    };
  }

  function TreeFileRow({ file, level }: { file: FileItem; level: number }) {
    const rowRef = useRef<HTMLDivElement>(null);
    return (
      <div className="group" role="none">
        <div
          ref={rowRef}
          data-tree-row="true"
          role="treeitem"
          aria-selected={selectedItems.has(file.id)}
          aria-level={level + 1}
          tabIndex={-1}
          data-testid="file-row"
          data-name={file.name}
          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ring/50"
          style={{ paddingLeft: level * 16 }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              focusNextPrev(rowRef.current, 1);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              focusNextPrev(rowRef.current, -1);
            }
          }}
        >
          <div className="w-6" />
          <Checkbox
            checked={selectedItems.has(file.id)}
            onCheckedChange={(checked) => onItemSelect(file.id, !!checked)}
          />
          <span className="text-sm" aria-hidden="true">
            {getFileIcon(file.mime_type, file.name)}
          </span>
          <span className="flex-1 font-medium">{file.name}</span>
          <span className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(file.created_at), "MMM d, yyyy")}
          </span>
          <div className="opacity-0 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`file-menu-${file.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDownload(file)}>
                  <Download className="h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFileDelete(file.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  function TreeFolderNode({
    folder,
    level,
  }: {
    folder: FolderItem;
    level: number;
  }) {
    const isExpanded = expandedFolders.has(folder.id);
    const { childFolders, childFiles, loading } = useChildren(folder.id);
    const rowRef = useRef<HTMLDivElement>(null);

    return (
      <div className="group" role="none">
        <div
          ref={rowRef}
          data-tree-row="true"
          role="treeitem"
          aria-expanded={isExpanded}
          aria-level={level + 1}
          aria-selected={selectedItems.has(folder.id)}
          data-testid="folder-row"
          data-name={folder.name}
          tabIndex={-1}
          className="flex items-center space-x-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-ring/50"
          style={{ paddingLeft: level * 16 }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              if (!isExpanded) toggleFolder(folder.id);
              else focusNextPrev(rowRef.current, 1);
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              if (isExpanded) toggleFolder(folder.id);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              focusNextPrev(rowRef.current, 1);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              focusNextPrev(rowRef.current, -1);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              onFolderOpen(folder.id);
            }
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent focus-visible:bg-transparent active:bg-transparent"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <Checkbox
            checked={selectedItems.has(folder.id)}
            onCheckedChange={(checked) => onItemSelect(folder.id, !!checked)}
          />
          <span className="text-sm" aria-hidden="true">
            📁
          </span>
          <span
            className="flex-1 cursor-pointer font-medium"
            onClick={() => onFolderOpen(folder.id)}
          >
            {folder.name}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(folder.created_at), "MMM d, yyyy")}
          </span>
          <div className="opacity-0 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onFolderDelete(folder.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isExpanded && (
          <div
            className="ml-4 border-l pl-4"
            role="group"
            aria-busy={loading || undefined}
          >
            {loading ? (
              <div className="text-xs text-muted-foreground py-2">
                Loading...
              </div>
            ) : (
              <>
                {childFolders.map((cf) => (
                  <TreeFolderNode key={cf.id} folder={cf} level={level + 1} />
                ))}
                {childFiles.map((f) => (
                  <TreeFileRow key={f.id} file={f} level={level + 1} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6" role="tree" aria-label="Files" ref={treeRootRef}>
      <div className="space-y-1" role="none">
        {folders.map((folder) => (
          <TreeFolderNode key={folder.id} folder={folder} level={0} />
        ))}

        {files.map((file) => (
          <TreeFileRow key={file.id} file={file} level={0} />
        ))}
      </div>
    </div>
  );
}
