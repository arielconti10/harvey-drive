"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { FileItem } from "@/lib/types";

interface PDFViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function PDFViewer({ file, onError }: PDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleZoomIn = () =>
    setZoom((prev) => {
      const next = Math.min(prev + 25, 200);
      if (next !== prev) {
        setLoading(true);
      }
      return next;
    });
  const handleZoomOut = () =>
    setZoom((prev) => {
      const next = Math.max(prev - 25, 50);
      if (next !== prev) {
        setLoading(true);
      }
      return next;
    });
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const viewerUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("file", file.blob_url);
    // pdfjs viewer supports zoom values like 100%, page, auto etc.
    params.set("zoom", `${zoom}`);
    // rotation is managed by hash in default viewer, we keep our own for now
    return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/web/viewer.html?${params.toString()}#page=${currentPage}`;
  }, [file.blob_url, currentPage, zoom]);

  useEffect(() => {
    setCurrentPage(1);
    setZoom(100);
    setRotation(0);
    setTotalPages(1);
    setLoading(true);
  }, [file.blob_url]);

  const handleIframeLoad = () => {
    setLoading(false);
    // Best-effort: try to read total pages via postMessage in future
  };

  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };
  return (
    <div className="flex flex-col h-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => {
                const next = Math.max(prev - 1, 1);
                if (next !== prev) {
                  setLoading(true);
                }
                return next;
              })
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => {
                const next = Math.min(prev + 1, totalPages);
                if (next !== prev) {
                  setLoading(true);
                }
                return next;
              })
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative bg-secondary">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/60 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ring)]"></div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={viewerUrl}
          className="w-full h-full border-0"
          title={file.name}
          onLoad={handleIframeLoad}
          onError={() => onError("Failed to load PDF")}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>
    </div>
  );
}
