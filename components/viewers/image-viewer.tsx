"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type { PointerEvent } from "react";
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointerId: 0,
  });

  const resetOffset = () => setOffset({ x: 0, y: 0 });

  const handleZoomIn = () => {
    const wasContain = fitMode === "contain";
    setFitMode("actual");
    setScale((prev) => {
      const base = wasContain ? 1 : prev;
      const next = Math.min(base + 0.25, 5);
      if (wasContain) {
        resetOffset();
        return next;
      }
      if (prev === 0) return next;
      const ratio = next / prev;
      setOffset((current) => ({
        x: current.x * ratio,
        y: current.y * ratio,
      }));
      return next;
    });
  };

  const handleZoomOut = () => {
    const wasContain = fitMode === "contain";
    setFitMode("actual");
    setScale((prev) => {
      const base = wasContain ? 1 : prev;
      const next = Math.max(base - 0.25, 0.25);
      if (wasContain) {
        resetOffset();
        return next;
      }
      if (prev === 0) return next;
      const ratio = next / prev;
      setOffset((current) => ({
        x: current.x * ratio,
        y: current.y * ratio,
      }));
      return next;
    });
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFitToScreen = () => {
    setFitMode("contain");
    setScale(1);
    setRotation(0);
    resetOffset();
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setFitMode("contain");
    resetOffset();
  };

  const effectiveScale = fitMode === "contain" ? 1 : scale;
  const zoomDisplay = Math.round(effectiveScale * 100);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (fitMode !== "actual" || event.button !== 0) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      pointerId,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || fitMode !== "actual") return;
    const { startX, startY, originX, originY } = dragState.current;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    setOffset({ x: originX + deltaX, y: originY + deltaY });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event.pointerId === dragState.current.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Image Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
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
            "size-full overflow-hidden",
            fitMode === "actual" && (isDragging ? "cursor-grabbing" : "cursor-grab")
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <div
            className={cn(
              "flex min-h-full min-w-full items-center justify-center p-4"
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
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${effectiveScale}) rotate(${rotation}deg)`,
                transformOrigin: "center",
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
