"use client";

import { useCallback, useMemo } from "react";
import type { DragEvent, ReactNode } from "react";
import type {
  FileItem,
  FolderItem,
  ViewMode,
  SortBy,
  SortOrder,
  SearchFilters,
} from "@/lib/types";
import { FileGridView } from "./file-grid-view";
import { FileListView } from "./file-list-view";
import { HtTreeView } from "./ht-tree-view";
import { EmptyState } from "./empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDropzone } from "react-dropzone";

interface FileExplorerProps {
  files: FileItem[];
  folders: FolderItem[];
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchFilters: SearchFilters;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFolderOpen: (folderId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onFileDownload: (file: FileItem) => void;
  onFilePreview: (file: FileItem) => void;
  onFileShare: (file: FileItem) => void;
  onRefresh: () => void;
  onRenameFile?: (id: string, name: string) => Promise<FileItem>;
  onRenameFolder?: (id: string, name: string) => Promise<FolderItem>;
  onFileStarToggle?: (fileId: string, starred: boolean) => Promise<void> | void;
  onFileMove?: (
    fileId: string,
    targetFolderId: string | null
  ) => Promise<void> | void;
  onUpload?: (files: FileList) => Promise<void> | void;
  onCreateFolder?: (name: string) => Promise<void> | void;
  canCreate?: boolean;
}

export function FileExplorer({
  files,
  folders,
  loading,
  error,
  viewMode,
  sortBy,
  sortOrder,
  searchFilters,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onDeselectAll,
  onFolderOpen,
  onFileDelete,
  onFolderDelete,
  onFileDownload,
  onFilePreview,
  onFileShare,
  onRefresh,
  onRenameFile,
  onRenameFolder,
  onFileStarToggle,
  onFileMove,
  onUpload,
  onCreateFolder,
  canCreate,
}: FileExplorerProps) {
  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filteredFiles = files;
    let filteredFolders = folders;

    // Apply search query filter
    const normalizedQuery = searchFilters.query.trim().toLowerCase();
    if (normalizedQuery) {
      filteredFiles = filteredFiles.filter((file) =>
        file.name.toLowerCase().includes(normalizedQuery)
      );
      filteredFolders = filteredFolders.filter((folder) =>
        folder.name.toLowerCase().includes(normalizedQuery)
      );
    }

    // Apply file type filter
    if (searchFilters.fileTypes.length > 0) {
      filteredFiles = filteredFiles.filter((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        return searchFilters.fileTypes.some((type) => {
          switch (type) {
            case "image":
              return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
                extension
              );
            case "document":
              return ["pdf", "doc", "docx", "txt", "rtf"].includes(extension);
            case "spreadsheet":
              return ["xls", "xlsx", "csv"].includes(extension);
            case "presentation":
              return ["ppt", "pptx"].includes(extension);
            case "video":
              return ["mp4", "avi", "mov", "wmv", "flv"].includes(extension);
            case "audio":
              return ["mp3", "wav", "flac", "aac"].includes(extension);
            case "archive":
              return ["zip", "rar", "7z", "tar", "gz"].includes(extension);
            default:
              return false;
          }
        });
      });
    }

    // Apply size filter
    if (searchFilters.sizeRange) {
      filteredFiles = filteredFiles.filter((file) => {
        const size = file.size || 0;
        return (
          size >= searchFilters.sizeRange!.min &&
          size <= searchFilters.sizeRange!.max
        );
      });
    }

    // Apply date range filter
    if (searchFilters.dateRange) {
      const fromDate = searchFilters.dateRange.from;
      const toDate = searchFilters.dateRange.to;

      filteredFiles = filteredFiles.filter((file) => {
        const fileDate = new Date(file.created_at);
        return fileDate >= fromDate && fileDate <= toDate;
      });

      filteredFolders = filteredFolders.filter((folder) => {
        const folderDate = new Date(folder.created_at);
        return folderDate >= fromDate && folderDate <= toDate;
      });
    }

    // Apply sharing status filter
    if (searchFilters.shared !== null) {
      // Placeholder for future server-side sharing filter
    }

    const applyOrder = (value: number) =>
      sortOrder === "asc" ? value : -value;

    const sortedFiles = [...filteredFiles].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return applyOrder(a.name.localeCompare(b.name));
        case "date":
          return applyOrder(
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "size":
          return applyOrder(a.size - b.size);
        case "type":
          return applyOrder(a.mime_type.localeCompare(b.mime_type));
        default:
          return 0;
      }
    });

    const sortedFolders = [...filteredFolders].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return applyOrder(
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        default:
          return applyOrder(a.name.localeCompare(b.name));
      }
    });

    return {
      files: sortedFiles,
      folders: sortedFolders,
    };
  }, [files, folders, searchFilters, sortBy, sortOrder]);

  const handleItemSelect = (itemId: string, selected: boolean) => {
    onItemSelect(itemId, selected);
  };

  const handleSelectAll = () => {
    onSelectAll();
  };

  const handleDeselectAll = () => {
    onDeselectAll();
  };

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!onUpload || acceptedFiles.length === 0) return;

      let fileList: FileList | null = null;
      if (
        typeof window !== "undefined" &&
        typeof DataTransfer !== "undefined"
      ) {
        const dataTransfer = new DataTransfer();
        for (const file of acceptedFiles) {
          dataTransfer.items.add(file);
        }
        fileList = dataTransfer.files;
      }

      void onUpload(fileList ?? (acceptedFiles as unknown as FileList));
    },
    [onUpload]
  );

  const isDropEnabled = Boolean(onUpload && canCreate !== false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    noClick: true,
    noKeyboard: true,
    multiple: true,
    disabled: !isDropEnabled,
    preventDropOnDocument: true,
  });

  const handleRootDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onFileMove) return;
      if (event.dataTransfer.types.includes("application/x-file-id")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }
    },
    [onFileMove]
  );

  const handleRootDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      void onFileMove(fileId, null);
    },
    [onFileMove]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="text-foreground hover:opacity-80"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hasItems =
    filteredAndSortedItems.files.length > 0 ||
    filteredAndSortedItems.folders.length > 0;

  const content: ReactNode = hasItems ? (
    (() => {
      const commonProps = {
        files: filteredAndSortedItems.files,
        folders: filteredAndSortedItems.folders,
        selectedItems,
        onItemSelect: handleItemSelect,
        onSelectAll: handleSelectAll,
        onDeselectAll: handleDeselectAll,
        onFolderOpen,
        onFileDelete,
        onFolderDelete,
        onFileDownload,
        onFilePreview,
        onFileShare,
        onRefresh,
        onRenameFile,
        onRenameFolder,
        onFileStarToggle,
        onFileMove,
      };

      switch (viewMode) {
        case "grid":
          return <FileGridView {...commonProps} />;
        case "list":
          return <FileListView {...commonProps} />;
        case "tree":
          return (
            <HtTreeView
              onFileDownload={onFileDownload}
              onFilePreview={onFilePreview}
              onFileShare={onFileShare}
              onFileDelete={onFileDelete}
              onFolderDelete={onFolderDelete}
              onFileMove={onFileMove}
            />
          );
        default:
          return <FileGridView {...commonProps} />;
      }
    })()
  ) : (
    <EmptyState
      searchQuery={searchFilters.query}
      onUpload={onUpload}
      onCreateFolder={onCreateFolder}
      canCreate={canCreate}
    />
  );

  const rootProps = getRootProps({
    className: `relative h-full min-h-[20rem] transition-colors ${
      isDropEnabled && isDragActive ? "ring-2 ring-ring ring-offset-2" : ""
    }`,
    onDragOver: handleRootDragOver,
    onDrop: handleRootDrop,
  });

  return (
    <div {...rootProps}>
      {isDropEnabled && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-muted/80 text-muted-foreground transition-opacity ${
            isDragActive ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-lg font-medium">Drop files to upload</p>
          <p className="text-sm">
            Files will be uploaded to the current folder.
          </p>
        </div>
      )}
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex-1 overflow-y-auto">{content}</div>
      </div>
      <input {...getInputProps()} />
    </div>
  );
}
