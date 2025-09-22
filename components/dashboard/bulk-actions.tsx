"use client";

import { Button } from "@/components/ui/button";
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
import { Download, Trash2, Share } from "lucide-react";
import { useMemo, useState } from "react";
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

  const singleSelectionLabel = useMemo(() => {
    if (selectedItems.size !== 1) return null;

    const singleFolder = selectedFolders.find((folder) =>
      selectedItems.has(folder.id)
    );
    if (singleFolder) {
      return singleFolder.name;
    }

    const singleFile = selectedFiles.find((file) =>
      selectedItems.has(file.id)
    );
    return singleFile?.name ?? null;
  }, [selectedFiles, selectedFolders, selectedItems]);

  if (selectedItems.size === 0) return null;

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
          "fixed bottom-4 z-50 mx-auto max-w-md border border-border bg-card text-card-foreground shadow-lg",
          "sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:right-auto sm:max-w-none sm:w-auto sm:-translate-x-1/2"
        )}
      >
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className="flex flex-col gap-1 text-sm font-medium sm:flex-row sm:items-center"
            aria-live="polite"
          >
            <span title={selectedItems.size === 1 ? singleSelectionLabel ?? undefined : undefined}>
              {selectedItems.size === 1
                ? `"${
                    singleSelectionLabel && singleSelectionLabel.length > 32
                      ? `${singleSelectionLabel.slice(0, 29)}…`
                      : singleSelectionLabel ?? "item"
                  }" selected`
                : `${selectedItems.size} items selected`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {selectedFiles.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleBulkDownload}>
                <Download />
                Download
              </Button>
            )}
            {shareDisabled ? (
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button size="sm" variant="outline" disabled>
                        <Share />
                        Share
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{shareButtonTitle}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button size="sm" variant="outline" onClick={handleBulkShare}>
                <Share />
                Share
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 />
              Delete
            </Button>
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
