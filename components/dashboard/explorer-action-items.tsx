"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Pencil, Eye, Star, Download, Share, Trash2 } from "lucide-react";
import type { FileItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { canPreview } from "@/lib/utils/file-utils";
import type { MouseEvent } from "react";

export type MenuActionWrapper = (
  action: () => void
) => (event: MouseEvent<HTMLElement>) => void;

const defaultWrapAction: MenuActionWrapper = (action) => (event) => {
  event.preventDefault();
  event.stopPropagation();
  action();
};

interface ExplorerFolderActionsProps {
  onRename?: () => void;
  onDelete?: () => void;
  wrapAction?: MenuActionWrapper;
}

export function ExplorerFolderActions({
  onRename,
  onDelete,
  wrapAction = defaultWrapAction,
}: ExplorerFolderActionsProps) {
  return (
    <>
      {onRename && (
        <DropdownMenuItem onClick={wrapAction(onRename)}>
          <Pencil className="h-4 w-4" />
          Rename
        </DropdownMenuItem>
      )}
      {onDelete && (
        <DropdownMenuItem onClick={wrapAction(onDelete)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      )}
    </>
  );
}

interface ExplorerFileActionsProps {
  file: FileItem;
  onRename?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onToggleStar?: () => void;
  onDelete?: () => void;
  wrapAction?: MenuActionWrapper;
  showStar?: boolean;
}

export function ExplorerFileActions({
  file,
  onRename,
  onPreview,
  onDownload,
  onShare,
  onToggleStar,
  onDelete,
  wrapAction = defaultWrapAction,
  showStar = true,
}: ExplorerFileActionsProps) {
  const previewable = onPreview && canPreview(file.mime_type, file.name);

  return (
    <>
      {onRename && (
        <DropdownMenuItem onClick={wrapAction(onRename)}>
          <Pencil className="h-4 w-4" />
          Rename
        </DropdownMenuItem>
      )}
      {previewable && (
        <DropdownMenuItem onClick={wrapAction(onPreview!)}>
          <Eye className="h-4 w-4" />
          Preview
        </DropdownMenuItem>
      )}
      {showStar && onToggleStar && (
        <DropdownMenuItem onClick={wrapAction(onToggleStar)}>
          <Star
            className={cn(
              "h-4 w-4",
              file.is_starred
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground"
            )}
          />
          {file.is_starred ? "Remove star" : "Add star"}
        </DropdownMenuItem>
      )}
      {onDownload && (
        <DropdownMenuItem onClick={wrapAction(onDownload)}>
          <Download className="h-4 w-4" />
          Download
        </DropdownMenuItem>
      )}
      {onShare && (
        <DropdownMenuItem onClick={wrapAction(onShare)} data-testid="btn-share">
          <Share className="h-4 w-4" />
          Share
        </DropdownMenuItem>
      )}
      {onDelete && (
        <DropdownMenuItem onClick={wrapAction(onDelete)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      )}
    </>
  );
}
