"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Folder, MoreVertical, Star } from "lucide-react";
import type { FileItem, FolderItem } from "@/lib/types";
import {
  formatFileSize,
  getFileIcon,
  canPreview,
} from "@/lib/utils/file-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
  onFileStarToggle?: (fileId: string, starred: boolean) => Promise<void> | void;
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
  onFileStarToggle,
  onFileMove,
}: FileListViewProps) {
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

  const allItems = [...folders, ...files];
  const allSelected =
    allItems.length > 0 && allItems.every((item) => selectedItems.has(item.id));
  const someSelected = allItems.some((item) => selectedItems.has(item.id));
  const headerCheckboxState: CheckedState = allSelected
    ? true
    : someSelected
    ? "indeterminate"
    : false;

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handlePreview = (file: FileItem) => {
    if (!onFilePreview || !canPreview(file.mime_type, file.name)) return;
    if (renamingId === file.id) return;
    onFilePreview(file);
  };

  return (
    <div className="p-4 sm:p-6 overflow-hidden">
      <div className="sm:hidden">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={headerCheckboxState}
              onCheckedChange={handleSelectAllToggle}
            />
            <span className="text-sm text-muted-foreground">
              {selectedItems.size > 0
                ? `${selectedItems.size} selected`
                : "Select items"}
            </span>
          </div>
          {selectedItems.size > 0 && (
            <Button size="sm" variant="ghost" onClick={onDeselectAll}>
              Clear
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {folders.map((folder) => {
            const isSelected = selectedItems.has(folder.id);
            const isDragTarget = dragOverFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className={cn(
                  "group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors",
                  isDragTarget && "ring-1 ring-ring",
                  isSelected && "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                )}
                onClick={() => onFolderOpen(folder.id)}
                aria-selected={isSelected}
                data-testid="folder-row"
                data-name={folder.name}
              >
                <Checkbox
                  checked={isSelected}
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
                      {isRenaming(folder.id) ? (
                        <Input
                          {...getRenameInputProps(folder.id, "folder")}
                          onClick={(event) => event.stopPropagation()}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <p className="truncate font-medium" title={folder.name}>
                          {folder.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Updated {format(new Date(folder.created_at), "MMM d, yyyy")}
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
                        <ExplorerFolderActions
                          onRename={() => startRename(folder.id, folder.name)}
                          onDelete={() => onFolderDelete(folder.id)}
                          wrapAction={wrapMenuAction}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}

          {files.map((file) => {
            const isSelected = selectedItems.has(file.id);
            return (
              <div
                key={file.id}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors",
                  isSelected && "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                )}
                onClick={() =>
                  canPreview(file.mime_type, file.name) && handlePreview(file)
                }
                aria-selected={isSelected}
                data-testid="file-row"
                data-name={file.name}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    onItemSelect(file.id, !!checked)
                  }
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xl" aria-hidden="true">
                      {getFileIcon(file.mime_type, file.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      {isRenaming(file.id) ? (
                        <Input
                          {...getRenameInputProps(file.id, "file")}
                          onClick={(event) => event.stopPropagation()}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <p
                          className="flex items-center gap-1 truncate font-medium"
                          title={file.name}
                        >
                          <span className="truncate">{file.name}</span>
                          {file.is_starred && (
                            <Star className="h-4 w-4 flex-shrink-0 fill-amber-500 text-amber-500" />
                          )}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} · {" "}
                        {format(new Date(file.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={headerCheckboxState}
                    onCheckedChange={handleSelectAllToggle}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Size
*** End Patch
                </TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => {
                const isSelected = selectedItems.has(folder.id);
                const isDragTarget = dragOverFolderId === folder.id;
                return (
                  <TableRow
                    key={folder.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      isDragTarget && "bg-accent/60",
                      isSelected && "bg-primary/5"
                    )}
                    data-testid="folder-row"
                    data-name={folder.name}
                    aria-selected={isSelected}
                    onClick={() => onFolderOpen(folder.id)}
                    onDragOver={(event) => handleFolderDragOver(event, folder.id)}
                    onDrop={(event) => handleFolderDrop(event, folder.id)}
                    onDragLeave={(event) => handleFolderDragLeave(event, folder.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          onItemSelect(folder.id, !!checked)
                        }
                        onClick={(event) => event.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Folder className="h-5 w-5 text-foreground" />
                        {isRenaming(folder.id) ? (
                          <Input
                            {...getRenameInputProps(folder.id, "folder")}
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
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
                          <ExplorerFolderActions
                            onRename={() => startRename(folder.id, folder.name)}
                            onDelete={() => onFolderDelete(folder.id)}
                            wrapAction={wrapMenuAction}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {files.map((file) => {
                const isSelected = selectedItems.has(file.id);
                return (
                  <TableRow
                    key={file.id}
                    className={cn(
                      "hover:bg-accent",
                      isSelected && "bg-primary/5"
                    )}
                    draggable
                    data-testid="file-row"
                    data-name={file.name}
                    aria-selected={isSelected}
                    onDragStart={(event) => handleDragStart(event, file)}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={() => handlePreview(file)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          onItemSelect(file.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {getFileIcon(file.mime_type, file.name)}
                        </span>
                        {isRenaming(file.id) ? (
                          <Input
                            {...getRenameInputProps(file.id, "file")}
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                            autoFocus
                            className="h-7 w-56"
                          />
                        ) : (
                          <span
                            className="flex items-center gap-1 truncate font-medium"
                            title={file.name}
                          >
                            <span className="truncate">{file.name}</span>
                            {file.is_starred && (
                              <Star className="h-4 w-4 flex-shrink-0 fill-amber-500 text-amber-500" />
                            )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`file-menu-${file.id}`}
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
