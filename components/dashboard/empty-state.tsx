"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FolderPlus, Search, HardDrive } from "lucide-react";
import type { DashboardView } from "@/lib/types";

interface EmptyStateProps {
  searchQuery?: string;
  onUpload?: (files: FileList) => Promise<void> | void;
  onCreateFolder?: (name: string) => Promise<void> | void;
  canCreate?: boolean;
  view?: DashboardView;
}

export function EmptyState({
  searchQuery,
  onUpload,
  onCreateFolder,
  canCreate = true,
  view = "files",
}: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderName, setFolderName] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  const handleUploadClick = () => {
    if (!canCreate) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0 && onUpload) {
      await onUpload(files);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim() || !onCreateFolder) return;

    await onCreateFolder(folderName.trim());
    setFolderName("");
    setCreateFolderOpen(false);
  };

  if (searchQuery) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center sm:min-h-[256px]">
        <Search className="h-16 w-16 mb-4" />
        <h3 className="text-lg font-medium mb-2">No results found</h3>
        <p className="mb-4">
          No files or folders match &ldquo;{searchQuery}&rdquo;. Try adjusting
          your search terms.
        </p>
      </div>
    );
  }

  const isSharedView = view === "shared";
  const isStarredView = view === "starred";
  const allowActions = view === "files";

  const title = isSharedView
    ? "No shared files yet"
    : isStarredView
    ? "No starred files yet"
    : "This folder is empty";

  const description = isSharedView
    ? "Files you share or receive will show up here. Create a share link from the file actions menu."
    : isStarredView
    ? "Star files from their actions menu to keep them handy."
    : "Get started by uploading files or creating folders.";

  return (
    <div className="mt-8 flex min-h-[220px] flex-col items-center justify-center px-4 text-center sm:min-h-[256px]">
      <div className="mb-4 rounded-full bg-accent p-6">
        <FolderPlus className="h-16 w-16" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>
      {allowActions && !canCreate && (
        <div className="mb-6 flex max-w-md items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-left text-sm text-muted-foreground">
          <HardDrive className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Create a dataroom first</p>
            <p className="text-xs text-muted-foreground">
              Uploads and folders live inside a dataroom. Once you create one
              from the sidebar, you&apos;ll be able to add content here.
            </p>
          </div>
        </div>
      )}
      {allowActions ? (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:space-x-3 sm:gap-0">
          <Button
            onClick={handleUploadClick}
            disabled={!canCreate || !onUpload}
          >
            <Upload />
            Upload files
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              canCreate && onCreateFolder && setCreateFolderOpen(true)
            }
            disabled={!canCreate || !onCreateFolder}
          >
            <FolderPlus />
            New folder
          </Button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {allowActions && createFolderOpen && onCreateFolder && (
        <div className="mt-8 w-full max-w-sm rounded-lg border border-border bg-card p-4 text-left shadow-sm">
          <h4 className="text-sm font-semibold text-foreground">New folder</h4>
          <p className="text-xs text-muted-foreground">
            Name the folder you want to add to this location.
          </p>
          <Input
            className="mt-3"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Enter folder name"
            onKeyDown={(event) =>
              event.key === "Enter" && handleCreateFolder()
            }
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
