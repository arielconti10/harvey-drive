"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Trash2, Share, Archive, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { FileItem, FolderItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BulkActionsProps {
  selectedItems: Set<string>;
  files: FileItem[];
  folders: FolderItem[];
  onDownload: (fileIds: string[]) => void;
  onDelete: (itemIds: string[]) => void;
  onShare: (itemIds: string[]) => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedItems,
  files,
  folders,
  onDownload,
  onDelete,
  onShare,
  onClearSelection,
}: BulkActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (selectedItems.size === 0) return null;

  const selectedFiles = files.filter((file) => selectedItems.has(file.id));
  const selectedFolders = folders.filter((folder) =>
    selectedItems.has(folder.id)
  );
  const selectedItemIds = Array.from(selectedItems);
  const shareDisabled =
    selectedFiles.length !== 1 || selectedFolders.length > 0;
  const shareButtonTitle = shareDisabled
    ? "Select exactly one file to share"
    : undefined;

  const handleBulkDownload = () => {
    const fileIds = selectedFiles.map((file) => file.id);
    if (fileIds.length > 0) {
      onDownload(fileIds);
    }
  };

  const handleBulkDelete = () => {
    onDelete(selectedItemIds);
    setDeleteDialogOpen(false);
    onClearSelection();
  };

  const handleBulkShare = () => {
    onShare(selectedItemIds);
  };

  return (
    <>
      <Card
        className={cn(
          "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border border-border bg-card text-card-foreground shadow-lg",
          "sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:right-auto sm:max-w-none sm:w-auto sm:-translate-x-1/2"
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="text-sm font-medium">
            {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {selectedFiles.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {shareDisabled ? (
                <TooltipProvider>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button size="sm" variant="outline" disabled>
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{shareButtonTitle}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button size="sm" variant="outline" onClick={handleBulkShare}>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                Cancel
              </Button>
            </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected items?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.size} item
              {selectedItems.size !== 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
