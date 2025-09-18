"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, RotateCw, Maximize2, RefreshCw } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface ImageViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function ImageViewer({ file, onError }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<"contain" | "actual">("contain");
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleZoomIn = () => {
    setFitMode("actual");
    setScale((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setFitMode("actual");
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFitToScreen = () => {
    setFitMode("contain");
    setScale(1);
    setRotation(0);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setFitMode("contain");
  };

  const effectiveScale = fitMode === "contain" ? 1 : scale;
  const zoomDisplay = Math.round(effectiveScale * 100);

  return (
    <div className="flex h-full flex-col">
      {/* Image Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          Image preview
          {dimensions && (
            <span className="ml-2 text-[11px] normal-case text-muted-foreground/80">
              {dimensions.width} × {dimensions.height} px
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3ch] text-center text-sm">{zoomDisplay}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleZoomIn}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRotate}
            aria-label="Rotate image"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFitToScreen}
            aria-label="Fit image to screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            aria-label="Reset image adjustments"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Display */}
      <div className="flex-1 overflow-hidden bg-secondary">
        <div
          className={cn(
            "size-full overflow-auto",
            fitMode === "actual" && "cursor-grab active:cursor-grabbing"
          )}
        >
          <div
            className={cn(
              "flex min-h-full min-w-full p-4",
              fitMode === "contain"
                ? "items-center justify-center"
                : "items-start justify-start"
            )}
          >
            <img
              src={file.blob_url || "/placeholder.svg"}
              alt={file.name}
              loading="eager"
              decoding="async"
              draggable={false}
              className={cn(
                "select-none transition-transform duration-150 ease-out",
                fitMode === "contain"
                  ? "max-h-full max-w-full object-contain"
                  : "max-h-none max-w-none"
              )}
              style={{
                transform: `scale(${effectiveScale}) rotate(${rotation}deg)`,
              }}
              width={
                fitMode === "contain"
                  ? undefined
                  : dimensions?.width ?? undefined
              }
              height={
                fitMode === "contain"
                  ? undefined
                  : dimensions?.height ?? undefined
              }
              onLoad={(event) =>
                setDimensions({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => onError("Failed to load image")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
