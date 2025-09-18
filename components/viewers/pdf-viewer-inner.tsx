// components/viewers/pdf-viewer-inner.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { FileItem } from "@/lib/types";
import { Document, Page, pdfjs } from "react-pdf";

// --- Worker configuration ----------------------------------------------
// Turbopack (Next.js 15) does not yet support bundling the pdf.js worker via
// `?url`, so we rely on the copy stored in /public instead.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface PDFViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function PdfViewerInner({ file, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageNumber(1);
    setScale(1.1);
    setRotation(0);
    setNumPages(0); // clear stale count when file changes
    setLoading(true);
  }, [file.blob_url]);

  const handleDocumentError = (error: Error) => {
    console.error("Failed to load PDF", error);
    setLoading(false);
    onError("Failed to load document");
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));
  const handleRotate = () =>
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  const handleReset = () => {
    setScale(1.1);
    setRotation(0);
  };

  const toolbarLabel = useMemo(() => {
    if (!numPages) return "PDF preview";
    return `PDF preview · ${Math.min(pageNumber, numPages)} / ${numPages}`;
  }, [numPages, pageNumber]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || (e.key === "PageDown" && !e.shiftKey)) {
      e.preventDefault();
      setPageNumber((prev) => Math.min(prev + 1, numPages || prev + 1));
    } else if (e.key === "ArrowLeft" || (e.key === "PageUp" && !e.shiftKey)) {
      e.preventDefault();
      setPageNumber((prev) => Math.max(prev - 1, 1));
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      handleZoomIn();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
      e.preventDefault();
      handleZoomOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
      e.preventDefault();
      handleReset();
    } else if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      handleRotate();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {toolbarLabel}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm" aria-live="polite">
            Page {Math.min(pageNumber, numPages)} of {numPages || "?"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPageNumber((prev) => Math.min(prev + 1, numPages || prev + 1))
            }
            disabled={numPages > 0 ? pageNumber >= numPages : false}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
          <span className="min-w-[3ch] text-center text-sm">
            {Math.round(scale * 100)}%
          </span>
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
            aria-label="Rotate document"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            aria-label="Reset view"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="relative flex flex-1 justify-center overflow-auto bg-secondary"
        onWheel={handleWheel}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-secondary/60">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ring)] border-t-transparent" />
          </div>
        )}
        <div className="px-4 py-6">
          <Document
            key={file.id || file.blob_url}
            file={file.blob_url}
            onLoadSuccess={({ numPages: nextNumPages }) => {
              setNumPages(nextNumPages);
              setLoading(false);
            }}
            onLoadError={handleDocumentError}
            loading={null}
            error={null}
            renderMode="canvas"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              className="shadow-md"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}

export type { PDFViewerProps };
