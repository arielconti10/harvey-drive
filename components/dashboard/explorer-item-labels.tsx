"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Star } from "lucide-react";

import type { FileItem, FolderItem } from "@/lib/types";
import { formatFileSize } from "@/lib/utils/file-utils";

interface ExplorerFolderNameProps {
  folder: FolderItem;
  isRenaming: boolean;
  renameInputProps?: React.ComponentProps<typeof Input>;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  onClick?: React.MouseEventHandler<HTMLParagraphElement>;
}

export function ExplorerFolderName({
  folder,
  isRenaming,
  renameInputProps,
  className,
  textClassName,
  inputClassName,
  onClick,
}: ExplorerFolderNameProps) {
  if (isRenaming) {
    const inputProps = renameInputProps ?? {};
    return (
      <Input
        {...inputProps}
        className={cn("h-7", inputProps.className, inputClassName)}
      />
    );
  }

  return (
    <p
      className={cn("truncate font-medium", className, textClassName)}
      title={folder.name}
      onClick={onClick}
    >
      {folder.name}
    </p>
  );
}

interface ExplorerFileNameProps {
  file: FileItem;
  isRenaming: boolean;
  renameInputProps?: React.ComponentProps<typeof Input>;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  showStar?: boolean;
  onClick?: React.MouseEventHandler<HTMLParagraphElement>;
}

export function ExplorerFileName({
  file,
  isRenaming,
  renameInputProps,
  className,
  textClassName,
  inputClassName,
  showStar = true,
  onClick,
}: ExplorerFileNameProps) {
  if (isRenaming) {
    const inputProps = renameInputProps ?? {};
    return (
      <Input
        {...inputProps}
        className={cn("h-7", inputProps.className, inputClassName)}
      />
    );
  }

  return (
    <p
      className={cn("flex items-center gap-1 truncate font-medium", className, textClassName)}
      title={file.name}
      onClick={onClick}
    >
      <span className="truncate">{file.name}</span>
      {showStar && file.is_starred ? (
        <Star className="h-4 w-4 flex-shrink-0 fill-amber-500 text-amber-500" />
      ) : null}
    </p>
  );
}

interface ExplorerFileMetaProps {
  file: FileItem;
  className?: string;
  showSize?: boolean;
  showDate?: boolean;
  dateFormat?: string;
  separator?: string;
}

export function ExplorerFileMeta({
  file,
  className,
  showSize = true,
  showDate = true,
  dateFormat = "MMM d, yyyy",
  separator = " • ",
}: ExplorerFileMetaProps) {
  const parts: string[] = [];
  if (showSize) parts.push(formatFileSize(file.size));
  if (showDate) parts.push(format(new Date(file.created_at), dateFormat));

  if (parts.length === 0) return null;

  return <p className={cn("text-xs text-muted-foreground", className)}>{parts.join(separator)}</p>;
}

interface ExplorerFolderMetaProps {
  folder: FolderItem;
  className?: string;
  dateFormat?: string;
  prefix?: string;
  suffix?: string;
}

export function ExplorerFolderMeta({
  folder,
  className,
  dateFormat = "MMM d, yyyy",
  prefix = "",
  suffix = "",
}: ExplorerFolderMetaProps) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {`${prefix}${format(new Date(folder.created_at), dateFormat)}${suffix}`}
    </p>
  );
}
