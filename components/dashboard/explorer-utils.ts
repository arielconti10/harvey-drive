"use client";

import type { MouseEvent } from "react";

import type { FileItem } from "@/lib/types";

export function downloadFileWithFallback(
  file: FileItem,
  onDownload?: (file: FileItem) => void
) {
  return () => {
    if (onDownload) {
      onDownload(file);
      return;
    }

    if (file.blob_url) {
      window.open(file.blob_url, "_blank", "noopener,noreferrer");
    }
  };
}

export function createMenuActionWrapper(
  onBefore?: (event: MouseEvent<HTMLElement>) => void
) {
  return (action: () => void) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onBefore?.(event);
    action();
  };
}
