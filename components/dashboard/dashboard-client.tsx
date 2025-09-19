"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardView, FileItem, SortBy, SortOrder } from "@/lib/types";
import { DashboardHeader } from "./dashboard-header";
import { FileExplorer } from "./file-explorer";
import { FileUploadZone } from "./file-upload-zone";
import { BulkActions } from "./bulk-actions";
import { DownloadManager } from "./download-manager";
import { FileViewer } from "../viewers/file-viewer";
import { ShareDialog } from "../sharing/share-dialog";
import { useFiles } from "@/lib/hooks/use-files";
import { useDownloadManager } from "@/lib/hooks/use-download-manager";
import { useUiStore } from "@/lib/store/ui";
import { toast } from "sonner";
import { ExplorerControls } from "./explorer-controls";
import { Progress } from "@/components/ui/progress";

export function DashboardClient({ view = "files" }: { view?: DashboardView }) {
  const defaultSortBy: SortBy = "date";
  const defaultSortOrder: SortOrder = "desc";
  const currentFolderId = useUiStore((s) => s.currentFolderId);
  const currentDataroomId = useUiStore((s) => s.currentDataroomId);
  const setCurrentFolderId = useUiStore((s) => s.setCurrentFolderId);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const sortBy = useUiStore((s) => s.sortBy);
  const setSortBy = useUiStore((s) => s.setSortBy);
  const sortOrder = useUiStore((s) => s.sortOrder);
  const setSortOrder = useUiStore((s) => s.setSortOrder);
  const searchFilters = useUiStore((s) => s.searchFilters);
  const setSearchFilters = useUiStore((s) => s.setSearchFilters);
  const selectedItems = useUiStore((s) => s.selectedItems);
  const setSelectedItems = useUiStore((s) => s.setSelectedItems);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const showUploadZone = useUiStore((s) => s.showUploadZone);
  const setShowUploadZone = useUiStore((s) => s.setShowUploadZone);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareFiles, setShareFiles] = useState<FileItem[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    active: false,
    total: 0,
    completed: 0,
  });
  const uploadHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginUploadTracking = useCallback((count: number) => {
    if (!count) return;
    if (uploadHideTimeout.current) {
      clearTimeout(uploadHideTimeout.current);
      uploadHideTimeout.current = null;
    }
    setUploadProgress({ active: true, total: count, completed: 0 });
    setShowUploadProgress(true);
  }, []);

  const markUploadStepComplete = useCallback(() => {
    setUploadProgress((prev) => {
      if (!prev.active) {
        return prev;
      }
      const completed = Math.min(prev.completed + 1, prev.total);
      const active = completed < prev.total;

      if (!active) {
        if (uploadHideTimeout.current) {
          clearTimeout(uploadHideTimeout.current);
        }
        uploadHideTimeout.current = setTimeout(() => {
          setShowUploadProgress(false);
          setUploadProgress({ active: false, total: 0, completed: 0 });
          uploadHideTimeout.current = null;
        }, 800);
      }

      return {
        active,
        total: prev.total,
        completed,
      };
    });
  }, []);

  const cancelUploadTracking = useCallback(() => {
    if (uploadHideTimeout.current) {
      clearTimeout(uploadHideTimeout.current);
      uploadHideTimeout.current = null;
    }
    setShowUploadProgress(false);
    setUploadProgress({ active: false, total: 0, completed: 0 });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchFilters({
      query: "",
      fileTypes: [],
      sizeRange: null,
      dateRange: null,
      owner: null,
      shared: null,
    });
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
  }, [setSearchFilters, setSortBy, setSortOrder, defaultSortBy, defaultSortOrder]);

  useEffect(() => {
    return () => {
      if (uploadHideTimeout.current) {
        clearTimeout(uploadHideTimeout.current);
      }
    };
  }, []);

  const resetStateForView = useCallback(() => {
    clearSelection();
    if (view !== "files") {
      setCurrentFolderId(null);
      setShowUploadZone(false);
    }
  }, [clearSelection, setCurrentFolderId, setShowUploadZone, view]);

  useEffect(() => {
    resetStateForView();
  }, [resetStateForView]);

  const {
    files,
    folders,
    loading,
    error,
    refetch,
    uploadFile,
    deleteFile,
    createFolder,
    deleteFolder,
    renameFile,
    renameFolder,
    toggleStar,
    moveFile,
  } = useFiles({
    folderId: view === "files" ? currentFolderId : null,
    dataroomId: currentDataroomId,
    searchQuery: searchFilters.query,
    view,
  });

  const {
    downloads,
    downloadFile,
    downloadMultipleFiles,
    removeDownload,
    clearCompleted,
  } = useDownloadManager();

  const handleFolderNavigate = (folderId: string | null) => {
    if (view !== "files") return;
    setCurrentFolderId(folderId);
    clearSelection();
  };

  const handleUploadComplete = () => {
    setShowUploadZone(false);
    toast.success("Upload completed");
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload failed:", error);
    toast.error(error.message || "Upload failed");
  };

  const handleExplorerUpload = async (files: FileList) => {
    if (view !== "files") return;
    try {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;
      beginUploadTracking(fileArray.length);

      await Promise.all(
        fileArray.map(async (file) => {
          try {
            await uploadFile(file, currentFolderId, currentDataroomId);
          } finally {
            markUploadStepComplete();
          }
        })
      );
      toast.success("Upload completed");
    } catch (error) {
      handleUploadError(
        error instanceof Error ? error : new Error("Upload failed")
      );
      cancelUploadTracking();
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name, currentFolderId);
      toast.success("Folder created");
    } catch (error) {
      console.error("Create folder failed:", error);
      toast.error((error as Error)?.message || "Create folder failed");
    }
  };

  const handleMoveFile = async (
    fileId: string,
    targetFolderId: string | null
  ) => {
    try {
      await moveFile(fileId, targetFolderId);
      toast.success("File moved");
    } catch (error) {
      console.error("Move file failed:", error);
      toast.error((error as Error)?.message || "Move failed");
    }
  };

  const handleToggleStar = async (fileId: string, starred: boolean) => {
    try {
      await toggleStar(fileId, starred);
      toast.success(starred ? "Added to starred" : "Removed from starred");
    } catch (error) {
      console.error("Toggle star failed:", error);
      toast.error((error as Error)?.message || "Update failed");
    }
  };

  const canCreate = view === "files" && Boolean(currentDataroomId);

  const handleItemSelect = (itemId: string, selected: boolean) => {
    const newSelection = new Set(selectedItems);
    if (selected) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = () => {
    const allIds = [...folders.map((f) => f.id), ...files.map((f) => f.id)];
    setSelectedItems(new Set(allIds));
  };

  const handleDeselectAll = () => {
    clearSelection();
  };

  const handleBulkDownload = (fileIds: string[]) => {
    const filesToDownload = files.filter((file) => fileIds.includes(file.id));
    downloadMultipleFiles(filesToDownload);
  };

  const handleBulkDelete = async (itemIds: string[]) => {
    try {
      const fileIds = files
        .filter((file) => itemIds.includes(file.id))
        .map((file) => file.id);
      const folderIds = folders
        .filter((folder) => itemIds.includes(folder.id))
        .map((folder) => folder.id);

      await Promise.all([
        ...fileIds.map((id) => deleteFile(id)),
        ...folderIds.map((id) => deleteFolder(id)),
      ]);
      toast.success("Items deleted");
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error((error as Error)?.message || "Delete failed");
    }
  };

  const handleSingleFileDelete = async (id: string) => {
    try {
      await deleteFile(id);
      toast.success("File deleted");
    } catch (e) {
      toast.error((e as Error)?.message || "Delete failed");
    }
  };

  const handleSingleFolderDelete = async (id: string) => {
    try {
      await deleteFolder(id);
      toast.success("Folder deleted");
    } catch (e) {
      toast.error((e as Error)?.message || "Delete failed");
    }
  };

  const handleBulkShare = (itemIds: string[]) => {
    const shareableFiles = files.filter((file) => itemIds.includes(file.id));

    if (shareableFiles.length === 0) {
      toast.info("Select a file to share");
      return;
    }

    if (shareableFiles.length > 1) {
      toast.info("Share supports one file at a time");
    }

    setShareFiles([shareableFiles[0]]);
  };

  const handleFilePreview = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleFileShare = (file: FileItem) => {
    setShareFiles([file]);
  };

  return (
    <>
      <DashboardHeader
        currentFolderId={currentFolderId}
        onNavigate={handleFolderNavigate}
        onFileMove={handleMoveFile}
      />

      {showUploadProgress && (
        <div className="px-4 pb-4 sm:px-6">
          <div className="rounded-lg border bg-background px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Uploading files…</span>
              <span>
                {Math.min(uploadProgress.completed, uploadProgress.total)} / {uploadProgress.total}
              </span>
            </div>
            <Progress
              value={
                uploadProgress.total
                  ? (uploadProgress.completed / uploadProgress.total) * 100
                  : undefined
              }
              className="mt-2"
            />
          </div>
        </div>
      )}

      {showUploadZone && (
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6 sm:py-6">
          <FileUploadZone
            onUpload={async (file) => {
              await uploadFile(file, currentFolderId, currentDataroomId);
            }}
            onComplete={handleUploadComplete}
            onError={handleUploadError}
            onBatchStart={beginUploadTracking}
            onFileUploaded={() => markUploadStepComplete()}
            onBatchEnd={(success) => {
              if (!success) {
                cancelUploadTracking();
              }
            }}
            className="mx-auto max-w-2xl"
          />
        </div>
      )}

      <ExplorerControls
        searchFilters={searchFilters}
        onSearchFiltersChange={setSearchFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onUpload={handleExplorerUpload}
        onCreateFolder={handleCreateFolder}
        onShowUploadZone={() => setShowUploadZone(true)}
        canCreate={canCreate}
        defaultSortBy={defaultSortBy}
        defaultSortOrder={defaultSortOrder}
        onReset={handleResetFilters}
      />

      <div className="flex-1 overflow-hidden">
        <FileExplorer
          files={files}
          folders={folders}
          loading={loading}
          error={error}
          viewMode={viewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchFilters={searchFilters}
          selectedItems={selectedItems}
          onItemSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onFolderOpen={handleFolderNavigate}
          onFileDelete={handleSingleFileDelete}
          onFolderDelete={handleSingleFolderDelete}
          onFileDownload={downloadFile}
          onFilePreview={handleFilePreview}
          onFileShare={handleFileShare}
          onRefresh={refetch}
          onRenameFile={(id, name) => renameFile(id, name)}
          onRenameFolder={(id, name) => renameFolder(id, name)}
          onFileStarToggle={handleToggleStar}
          onUpload={handleExplorerUpload}
          onCreateFolder={handleCreateFolder}
          onFileMove={handleMoveFile}
          canCreate={canCreate}
        />
      </div>

      <FileViewer
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={downloadFile}
      />

      <ShareDialog
        files={shareFiles}
        isOpen={shareFiles.length > 0}
        onClose={() => setShareFiles([])}
      />

      <BulkActions
        selectedItems={selectedItems}
        files={files}
        folders={folders}
        onDownload={handleBulkDownload}
        onDelete={handleBulkDelete}
        onShare={handleBulkShare}
        onClearSelection={handleDeselectAll}
      />

      <DownloadManager
        downloads={downloads}
        onRemoveDownload={removeDownload}
        onClearCompleted={clearCompleted}
      />
    </>
  );
}
