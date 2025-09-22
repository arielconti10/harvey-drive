"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  MoreVertical,
  Star,
} from "lucide-react";
import type { FileItem, FolderItem } from "@/lib/types";
import { formatFileSize, getFileIcon, canPreview } from "@/lib/utils/file-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  useItemRename,
  useFileDragAndDrop,
} from "./use-explorer-interactions";
import {
  ExplorerFileActions,
  ExplorerFolderActions,
} from "./explorer-action-items";
import {
  downloadFileWithFallback,
  createMenuActionWrapper,
} from "./explorer-utils";

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
  onFileStarToggle?: (fileId: string, starred: boolean) => Promise<void> | void;
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
  onFileStarToggle,
  onFileMove,
}: FileGridViewProps) {
  const {
    renamingId,
    startRename,
    getRenameInputProps,
    isRenaming,
  } = useItemRename({ onRenameFile, onRenameFolder });

  const {
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleFolderDragOver,
    handleFolderDrop,
    handleFolderDragLeave,
  } = useFileDragAndDrop({ onFileMove });

  const wrapMenuAction = createMenuActionWrapper();

  const handlePreview = (file: FileItem) => {
    if (!onFilePreview) return;
    if (renamingId === file.id) return;
    onFilePreview(file);
  };

  return (
    <div className="p-4 sm:p-6 overflow-hidden">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {folders.map((folder) => {
          const isSelected = selectedItems.has(folder.id);
          const isDragTarget = dragOverFolderId === folder.id;
          return (
            <Card
              key={folder.id}
              className={cn(
                "group relative cursor-pointer transition-shadow",
                isSelected && "border-primary/50 bg-primary/5 shadow-md",
                !isSelected && "hover:shadow-md"
              )}
              data-testid="folder-row"
              data-name={folder.name}
              aria-selected={isSelected}
              onClick={(event) => {
                event.preventDefault();
                onFolderOpen(folder.id);
              }}
              onDragOver={(event) => handleFolderDragOver(event, folder.id)}
              onDrop={(event) => handleFolderDrop(event, folder.id)}
              onDragLeave={(event) => handleFolderDragLeave(event, folder.id)}
            >
              <CardContent
                className={cn(
                  "p-4 text-center transition-colors",
                  isDragTarget && "border border-ring"
                )}
              >
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      onItemSelect(folder.id, !!checked)
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <ExplorerFolderActions
                        onRename={() => startRename(folder.id, folder.name)}
                        onDelete={() => onFolderDelete(folder.id)}
                        wrapAction={wrapMenuAction}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Folder className="h-12 w-12 mx-auto mb-2 text-foreground" />
                {isRenaming(folder.id) ? (
                  <Input
                    {...getRenameInputProps(folder.id, "folder")}
                    onClick={(event) => event.stopPropagation()}
                    autoFocus
                    className="h-7"
                  />
                ) : (
                  <p
                    className="text-sm font-medium truncate"
                    title={folder.name}
                  >
                    {folder.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(folder.created_at), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {files.map((file) => {
          const isSelected = selectedItems.has(file.id);
          return (
            <Card
              key={file.id}
              className={cn(
                "group relative cursor-pointer transition-shadow",
                isSelected && "border-primary/50 bg-primary/5 shadow-md",
                !isSelected && "hover:shadow-md"
              )}
              data-testid="file-row"
              data-name={file.name}
              aria-selected={isSelected}
              draggable
              onDragStart={(event) => handleDragStart(event, file)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() =>
                canPreview(file.mime_type, file.name) && handlePreview(file)
              }
            >
              <CardContent className="p-4 text-center">
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      onItemSelect(file.id, !!checked)
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`file-menu-${file.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <ExplorerFileActions
                        file={file}
                        onRename={() => startRename(file.id, file.name)}
                        onPreview={
                          onFilePreview ? () => onFilePreview(file) : undefined
                        }
                        onDownload={downloadFileWithFallback(
                          file,
                          onFileDownload
                        )}
                        onShare={
                          onFileShare ? () => onFileShare(file) : undefined
                        }
                        onToggleStar={
                          onFileStarToggle
                            ? () => onFileStarToggle(file.id, !file.is_starred)
                            : undefined
                        }
                        onDelete={() => onFileDelete(file.id)}
                        wrapAction={wrapMenuAction}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div
                  onClick={() => {
                    if (
                      onFilePreview &&
                      renamingId !== file.id &&
                      canPreview(file.mime_type, file.name)
                    ) {
                      onFilePreview(file);
                    }
                  }}
                >
                  <div className="h-12 w-12 mx-auto mb-2 flex items-center justify-center text-2xl">
                    {getFileIcon(file.mime_type, file.name)}
                  </div>
                  {isRenaming(file.id) ? (
                    <Input
                      {...getRenameInputProps(file.id, "file")}
                      onClick={(event) => event.stopPropagation()}
                      autoFocus
                      className="h-7"
                    />
                  ) : (
                    <p
                      className="text-sm font-medium truncate"
                      title={file.name}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <span className="truncate">{file.name}</span>
                        {file.is_starred && (
                          <Star className="h-4 w-4 flex-shrink-0 fill-amber-500 text-amber-500" />
                        )}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • {" "}
                    {format(new Date(file.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
