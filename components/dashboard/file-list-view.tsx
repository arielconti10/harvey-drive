"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import type { DragEvent } from "react";
import { Input } from "@/components/ui/input";
import {
  Folder,
  MoreVertical,
  Download,
  Trash2,
  Share,
  Eye,
  Pencil,
} from "lucide-react";
import type { FileItem, FolderItem } from "@/lib/types";
import {
  formatFileSize,
  getFileIcon,
  canPreview,
} from "@/lib/utils/file-utils";
import Image from "next/image";
import { format } from "date-fns";

interface FileListViewProps {
  files: FileItem[];
  folders: FolderItem[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFolderOpen: (folderId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onRenameFile?: (id: string, name: string) => Promise<FileItem>;
  onRenameFolder?: (id: string, name: string) => Promise<FolderItem>;
  onFileDownload?: (file: FileItem) => void;
  onFilePreview?: (file: FileItem) => void;
  onFileShare?: (file: FileItem) => void;
  onFileMove?: (
    fileId: string,
    targetFolderId: string | null
  ) => Promise<void> | void;
}

export function FileListView({
  files,
  folders,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onDeselectAll,
  onFolderOpen,
  onFileDelete,
  onFolderDelete,
  onRenameFile,
  onRenameFolder,
  onFileDownload,
  onFileShare,
  onFilePreview,
  onFileMove,
}: FileListViewProps) {
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
  const allItems = [...folders, ...files];
  const allSelected =
    allItems.length > 0 && allItems.every((item) => selectedItems.has(item.id));
  const someSelected = allItems.some((item) => selectedItems.has(item.id));

  const handleDownload = (file: FileItem) => {
    if (onFileDownload) {
      onFileDownload(file);
      return;
    }
    window.open(file.blob_url, "_blank");
  };

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
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
    void onFileMove(fileId, folderId);
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
    if (!onFilePreview || !canPreview(file.mime_type, file.name)) return;
    onFilePreview(file);
  };

  return (
    <div className="p-4 sm:p-6 overflow-hidden">
      <div className="sm:hidden">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onCheckedChange={handleSelectAllToggle}
            />
            <span className="text-sm text-muted-foreground">
              {selectedItems.size > 0
                ? `${selectedItems.size} selected`
                : "Select items"}
            </span>
          </div>
          {someSelected && (
            <Button size="sm" variant="ghost" onClick={onDeselectAll}>
              Clear
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors ${
                dragOverFolderId === folder.id ? "ring-1 ring-ring" : ""
              }`}
              onClick={() => onFolderOpen(folder.id)}
            >
              <Checkbox
                checked={selectedItems.has(folder.id)}
                onCheckedChange={(checked) =>
                  onItemSelect(folder.id, !!checked)
                }
                onClick={(event) => event.stopPropagation()}
                className="mt-1"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Folder className="h-5 w-5 shrink-0 text-foreground" />
                  <div className="min-w-0 flex-1">
                    {renamingId === folder.id ? (
                      <Input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => submitRename(folder.id, "folder")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            submitRename(folder.id, "folder");
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                    ) : (
                      <p className="truncate font-medium" title={folder.name}>
                        {folder.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated{" "}
                      {format(new Date(folder.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon">
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => startRename(folder.id, folder.name)}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onFolderDelete(folder.id)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}

          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              onClick={() =>
                canPreview(file.mime_type, file.name) && handlePreview(file)
              }
            >
              <Checkbox
                checked={selectedItems.has(file.id)}
                onCheckedChange={(checked) => onItemSelect(file.id, !!checked)}
                onClick={(event) => event.stopPropagation()}
                className="mt-1"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start gap-3">
                  {file.mime_type.startsWith("image/") ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border">
                      <Image
                        src={file.blob_url || "/placeholder.svg"}
                        alt={file.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span className="text-xl" aria-hidden="true">
                      {getFileIcon(file.mime_type, file.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {renamingId === file.id ? (
                      <Input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => submitRename(file.id, "file")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            submitRename(file.id, "file");
                          if (event.key === "Escape") setRenamingId(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                    ) : (
                      <p className="truncate font-medium" title={file.name}>
                        {file.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} ·{" "}
                      {format(new Date(file.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => startRename(file.id, file.name)}
                      >
                        Rename
                      </DropdownMenuItem>
                      {canPreview(file.mime_type, file.name) && (
                        <DropdownMenuItem onClick={() => handlePreview(file)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFileShare?.(file)}>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFileDelete(file.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onCheckedChange={handleSelectAllToggle}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => (
                <TableRow
                  key={folder.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    dragOverFolderId === folder.id ? "bg-accent/60" : ""
                  }`}
                  onClick={() => onFolderOpen(folder.id)}
                  onDragOver={(event) => handleFolderDragOver(event, folder.id)}
                  onDrop={(event) => handleFolderDrop(event, folder.id)}
                  onDragLeave={(event) =>
                    handleFolderDragLeave(event, folder.id)
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(folder.id)}
                      onCheckedChange={(checked) =>
                        onItemSelect(folder.id, !!checked)
                      }
                      onClick={(event) => event.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Folder className="h-5 w-5 text-foreground" />
                      {renamingId === folder.id ? (
                        <Input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          onBlur={() => submitRename(folder.id, "folder")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter")
                              submitRename(folder.id, "folder");
                            if (event.key === "Escape") setRenamingId(null);
                          }}
                          autoFocus
                          className="h-7 w-56"
                        />
                      ) : (
                        <span
                          className="truncate font-medium"
                          title={folder.name}
                        >
                          {folder.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(folder.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => startRename(folder.id, folder.name)}
                        >
                          <Pencil />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onFolderDelete(folder.id)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}

              {files.map((file) => (
                <TableRow
                  key={file.id}
                  className="hover:bg-accent"
                  draggable
                  onDragStart={(event) => handleDragStart(event, file)}
                  onDragEnd={handleDragEnd}
                  onDoubleClick={() => handlePreview(file)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(file.id)}
                      onCheckedChange={(checked) =>
                        onItemSelect(file.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {file.mime_type.startsWith("image/") ? (
                        <div className="relative h-5 w-5 overflow-hidden rounded">
                          <Image
                            src={file.blob_url || "/placeholder.svg"}
                            alt={file.name}
                            fill
                            sizes="20px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-lg">
                          {getFileIcon(file.mime_type, file.name)}
                        </span>
                      )}
                      {renamingId === file.id ? (
                        <Input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          onBlur={() => submitRename(file.id, "file")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter")
                              submitRename(file.id, "file");
                            if (event.key === "Escape") setRenamingId(null);
                          }}
                          autoFocus
                          className="h-7 w-56"
                        />
                      ) : (
                        <span
                          className="truncate font-medium"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(file.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(file.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
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
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFileShare?.(file)}>
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFileDelete(file.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
