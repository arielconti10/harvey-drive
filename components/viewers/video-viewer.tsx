"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Repeat, Volume2, VolumeX } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface VideoViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function VideoViewer({ file, onError }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Video preview</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isLooping ? "default" : "outline"}
            onClick={() => setIsLooping((prev) => !prev)}
            aria-pressed={isLooping}
          >
            <Repeat className="mr-2 h-4 w-4" />
            {isLooping ? "Looping" : "Loop"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleMute}
            aria-pressed={isMuted}
          >
            {isMuted ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" /> Muted
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-black p-2">
        <video
          ref={videoRef}
          src={file.blob_url}
          controls
          loop={isLooping}
          muted={isMuted}
          playsInline
          preload="metadata"
          draggable={false}
          className="h-full w-full"
          style={{ objectFit: "contain" }}
          onError={() => onError("Failed to load video")}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
