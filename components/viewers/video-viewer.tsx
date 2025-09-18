"use client";

import type { FileItem } from "@/lib/types";

interface VideoViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function VideoViewer({ file, onError }: VideoViewerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Video Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">{file.name}</span>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 bg-black flex items-center justify-center">
        <video
          src={file.blob_url}
          controls
          className="max-w-full max-h-full"
          onError={() => onError("Failed to load video")}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
