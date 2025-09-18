"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface ImageViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function ImageViewer({ file, onError }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fitToScreen, setFitToScreen] = useState(true);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 500));
    setFitToScreen(false);
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25));
    setFitToScreen(false);
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFitToScreen = () => {
    setFitToScreen(true);
    setZoom(100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Image Controls */}
      <div className="flex items-center justify-end gap-2 p-4 border-b border-border">
        <Button size="sm" variant="outline" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm">{zoom}%</span>
        <Button size="sm" variant="outline" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleFitToScreen}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Image Display */}
      <div className="flex-1 overflow-auto bg-secondary flex items-center justify-center p-4">
        <img
          src={file.blob_url || "/placeholder.svg"}
          alt={file.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            width: fitToScreen ? "auto" : undefined,
            height: fitToScreen ? "auto" : undefined,
          }}
          onError={() => onError("Failed to load image")}
        />
      </div>
    </div>
  );
}
