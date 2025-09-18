"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Share,
  Eye,
} from "lucide-react";
import type { FileItem, FolderItem } from "@/lib/types";
import {
  formatFileSize,
  getFileIcon,
  canPreview,
} from "@/lib/utils/file-utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { DragEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface FileGridViewProps {
  files: FileItem[];
  folders: FolderItem[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFolderOpen: (folderId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onFileDownload?: (file: FileItem) => void;
  onFilePreview?: (file: FileItem) => void;
  onRenameFile?: (id: string, name: string) => Promise<FileItem>;
  onRenameFolder?: (id: string, name: string) => Promise<FolderItem>;
  onFileShare?: (file: FileItem) => void;
  onFileMove?: (
    fileId: string,
    targetFolderId: string | null
  ) => Promise<void> | void;
}

export function FileGridView({
  files,
  folders,
  selectedItems,
  onItemSelect,
  onFolderOpen,
  onFileDelete,
  onFolderDelete,
  onFileDownload,
  onFilePreview,
  onRenameFile,
  onRenameFolder,
  onFileShare,
  onFileMove,
}: FileGridViewProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };

  const submitRename = async (id: string, type: "file" | "folder") => {
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    try {
      if (type === "file" && onRenameFile) await onRenameFile(id, name);
      if (type === "folder" && onRenameFolder) await onRenameFolder(id, name);
      toast.success("Renamed");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Rename failed";
      toast.error(message);
    } finally {
      setRenamingId(null);
    }
  };
  const handleDownload = (file: FileItem) => {
    if (onFileDownload) {
      onFileDownload(file);
    } else {
      window.open(file.blob_url, "_blank");
    }
  };

  const handleDragStart = (event: DragEvent, file: FileItem) => {
    event.dataTransfer.setData("application/x-file-id", file.id);
    if (file.folder_id) {
      event.dataTransfer.setData(
        "application/x-source-folder-id",
        file.folder_id
      );
    }
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (event: DragEvent, folderId: string) => {
    if (!onFileMove) return;
    if (!event.dataTransfer.types.includes("application/x-file-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  };

  const handleFolderDrop = (event: DragEvent, folderId: string) => {
    if (!onFileMove) return;
    const fileId = event.dataTransfer.getData("application/x-file-id");
    if (!fileId) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOverFolderId(null);
    void onFileMove?.(fileId, folderId);
  };

  const handleFolderDragLeave = (event: DragEvent, folderId: string) => {
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) {
      if (dragOverFolderId === folderId) {
        setDragOverFolderId(null);
      }
    }
  };

  const handlePreview = (file: FileItem) => {
    if (onFilePreview) {
      onFilePreview(file);
    }
  };

  return (
    <div className="p-4 sm:p-6 overflow-hidden">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {/* Folders */}
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="group cursor-pointer hover:shadow-md transition-shadow relative"
            onClick={() => onFolderOpen(folder.id)}
            onDragOver={(event) => handleFolderDragOver(event, folder.id)}
            onDrop={(event) => handleFolderDrop(event, folder.id)}
            onDragLeave={(event) => handleFolderDragLeave(event, folder.id)}
          >
            <CardContent
              className={`p-4 text-center transition-colors ${
                dragOverFolderId === folder.id ? "border border-ring" : ""
              }`}
            >
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedItems.has(folder.id)}
                  onCheckedChange={(checked) =>
                    onItemSelect(folder.id, !!checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => startRename(folder.id, folder.name)}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFolderDelete(folder.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Folder className="h-12 w-12 mx-auto mb-2 text-foreground" />
              {renamingId === folder.id ? (
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(folder.id, "folder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename(folder.id, "folder");
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                  className="h-7"
                />
              ) : (
                <p className="text-sm font-medium truncate" title={folder.name}>
                  {folder.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(folder.created_at), "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Files */}
        {files.map((file) => (
          <Card
            key={file.id}
            className="group cursor-pointer hover:shadow-md transition-shadow relative"
            draggable
            onDragStart={(event) => handleDragStart(event, file)}
            onDragEnd={handleDragEnd}
          >
            <CardContent className="p-4 text-center">
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedItems.has(file.id)}
                  onCheckedChange={(checked) =>
                    onItemSelect(file.id, !!checked)
                  }
                />
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => startRename(file.id, file.name)}
                    >
                      Rename
                    </DropdownMenuItem>
                    {canPreview(file.mime_type, file.name) && (
                      <DropdownMenuItem onClick={() => handlePreview(file)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileShare?.(file)}>
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileDelete(file.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div
                onClick={() =>
                  canPreview(file.mime_type, file.name) && handlePreview(file)
                }
              >
                {file?.mime_type?.startsWith("image/") ? (
                  <Image
                    src={file.blob_url || "/placeholder.svg"}
                    alt={file.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 mx-auto mb-2 object-cover rounded"
                    unoptimized
                  />
                ) : (
                  <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center text-2xl">
                    {getFileIcon(file.mime_type, file.name)}
                  </div>
                )}
                {renamingId === file.id ? (
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(file.id, "file")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename(file.id, "file");
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    autoFocus
                    className="h-7"
                  />
                ) : (
                  <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} •{" "}
                  {format(new Date(file.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
