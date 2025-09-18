"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, FolderPlus, Search } from "lucide-react";

interface EmptyStateProps {
  searchQuery?: string;
  onUpload?: (files: FileList) => Promise<void> | void;
  onCreateFolder?: (name: string) => Promise<void> | void;
  canCreate?: boolean;
}

export function EmptyState({
  searchQuery,
  onUpload,
  onCreateFolder,
  canCreate = true,
}: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderName, setFolderName] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

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

    try {
      setIsCreatingFolder(true);
      await onCreateFolder(folderName.trim());
      setFolderName("");
      setCreateFolderOpen(false);
    } finally {
      setIsCreatingFolder(false);
    }
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

  return (
    <div className="mt-8 flex min-h-[220px] flex-col items-center justify-center px-4 text-center sm:min-h-[256px]">
      <div className="mb-4 rounded-full bg-accent p-6 ">
        <FolderPlus className="h-16 w-16 " />
      </div>
      <h3 className="text-lg font-medium mb-2">This folder is empty</h3>
      <p className="mb-6">
        Get started by uploading files or creating folders.
      </p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:space-x-3 sm:gap-0">
        <Button onClick={handleUploadClick} disabled={!canCreate || !onUpload}>
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="empty-state-folder-name">Folder Name</Label>
              <Input
                id="empty-state-folder-name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(event) =>
                  event.key === "Enter" &&
                  !isCreatingFolder &&
                  handleCreateFolder()
                }
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setCreateFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || isCreatingFolder}
              >
                {isCreatingFolder ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
