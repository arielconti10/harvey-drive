"use client";

import type { FileItem } from "@/lib/types";

interface AudioViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function AudioViewer({ file, onError }: AudioViewerProps) {
  return (
    <div className="flex h-full flex-col bg-secondary">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Audio preview
            </p>
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
