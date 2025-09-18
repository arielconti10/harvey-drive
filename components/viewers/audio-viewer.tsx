"use client";

import type { FileItem } from "@/lib/types";

interface AudioViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function AudioViewer({ file, onError }: AudioViewerProps) {
  const mimeLabel = file.mime_type?.split(";")[0] ?? null;

  return (
    <div className="flex h-full flex-col bg-secondary">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Audio preview
        </p>
        {mimeLabel && (
          <span className="text-xs text-muted-foreground" title={mimeLabel}>
            {mimeLabel}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <audio
              className="w-full"
              controls
              controlsList="nodownload"
              preload="metadata"
              onError={() => onError("Failed to load audio file")}
            >
              <source src={file.blob_url} type={file.mime_type || undefined} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      </div>
    </div>
  );
}
