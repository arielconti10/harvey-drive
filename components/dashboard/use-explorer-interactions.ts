"use client";

import { useCallback, useMemo, useState } from "react";
import type { FileItem, FolderItem } from "@/lib/types";
import { toast } from "sonner";

export type ExplorerItemType = "file" | "folder";

interface UseItemRenameOptions {
  onRenameFile?: (id: string, name: string) => Promise<FileItem>;
  onRenameFolder?: (id: string, name: string) => Promise<FolderItem>;
}

export function useItemRename({
  onRenameFile,
  onRenameFolder,
}: UseItemRenameOptions) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const isRenaming = useCallback(
    (id: string) => renamingId === id,
    [renamingId]
  );

  const startRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  const submitRename = useCallback(
    async (id: string, type: ExplorerItemType) => {
      const trimmed = renameValue.trim();
      if (!trimmed) {
        cancelRename();
        return;
      }

      try {
        if (type === "file") {
          if (!onRenameFile) return;
          await onRenameFile(id, trimmed);
        } else {
          if (!onRenameFolder) return;
          await onRenameFolder(id, trimmed);
        }
        toast.success("Renamed");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Rename failed";
        toast.error(message);
      } finally {
        cancelRename();
      }
    },
    [cancelRename, onRenameFile, onRenameFolder, renameValue]
  );

  const getRenameInputProps = useCallback(
    (id: string, type: ExplorerItemType) => ({
      value: renameValue,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setRenameValue(event.target.value),
      onBlur: () => submitRename(id, type),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void submitRename(id, type);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelRename();
        }
      },
    }),
    [cancelRename, renameValue, submitRename]
  );

  return useMemo(
    () => ({
      renamingId,
      renameValue,
      isRenaming,
      startRename,
      cancelRename,
      submitRename,
      getRenameInputProps,
    }),
    [
      renamingId,
      renameValue,
      isRenaming,
      startRename,
      cancelRename,
      submitRename,
      getRenameInputProps,
    ]
  );
}

interface UseFileDragAndDropOptions {
  onFileMove?: (fileId: string, targetFolderId: string | null) =>
    | Promise<void>
    | void;
}

export function useFileDragAndDrop({
  onFileMove,
}: UseFileDragAndDropOptions = {}) {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: React.DragEvent, file: FileItem) => {
    event.dataTransfer.setData("application/x-file-id", file.id);
    if (file.folder_id) {
      event.dataTransfer.setData("application/x-source-folder-id", file.folder_id);
    }
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleFolderDragOver = useCallback(
    (event: React.DragEvent, folderId: string) => {
      if (!onFileMove) return;
      if (!event.dataTransfer.types.includes("application/x-file-id")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverFolderId(folderId);
    },
    [onFileMove]
  );

  const handleFolderDrop = useCallback(
    (event: React.DragEvent, folderId: string) => {
      if (!onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);
      void onFileMove(fileId, folderId);
    },
    [onFileMove]
  );

  const handleFolderDragLeave = useCallback(
    (event: React.DragEvent, folderId: string) => {
      const related = event.relatedTarget as Node | null;
      if (!related || !event.currentTarget.contains(related)) {
        setDragOverFolderId((current) => (current === folderId ? null : current));
      }
    },
    []
  );

  const handleRootDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onFileMove) return;
      if (!event.dataTransfer.types.includes("application/x-file-id")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverFolderId(null);
    },
    [onFileMove]
  );

  const handleRootDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onFileMove) return;
      const fileId = event.dataTransfer.getData("application/x-file-id");
      if (!fileId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);
      void onFileMove(fileId, null);
    },
    [onFileMove]
  );

  return {
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleFolderDragOver,
    handleFolderDrop,
    handleFolderDragLeave,
    handleRootDragOver,
    handleRootDrop,
  };
}
