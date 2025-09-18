"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, ExternalLink, RefreshCw } from "lucide-react";
import type { FileItem } from "@/lib/types";
import {
  formatFileSize,
  getFileCategory,
  getFileViewerType,
} from "@/lib/utils/file-utils";
import { FILE_TYPE_GROUPS } from "@/lib/constants/files";
import type { FileViewerType } from "@/lib/utils/file-utils";

type ViewerProps = { file: FileItem; onError: (msg: string) => void };

const LoadingPane = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ring)] border-t-transparent" />
  </div>
);

// Code-split viewers; client-only
const ImageViewer = dynamic(
  () => import("./image-viewer").then((m) => m.ImageViewer),
  {
    ssr: false,
    loading: LoadingPane,
  }
);
const VideoViewer = dynamic(
  () => import("./video-viewer").then((m) => m.VideoViewer),
  {
    ssr: false,
    loading: LoadingPane,
  }
);
const AudioViewer = dynamic(
  () => import("./audio-viewer").then((m) => m.AudioViewer),
  {
    ssr: false,
    loading: LoadingPane,
  }
);
const OfficeViewer = dynamic(
  () => import("./office-viewer").then((m) => m.OfficeViewer),
  {
    ssr: false,
    loading: LoadingPane,
  }
);
const PDFViewer = dynamic(
  () => import("./pdf-viewer").then((m) => m.PDFViewer),
  {
    ssr: false,
    loading: LoadingPane,
  }
);
const TextViewer = dynamic(
  () => import("./text-viewer").then((m) => m.TextViewer),
  {
    ssr: false,
    loading: LoadingPane,
  }
);
const AdobeRasterViewer = dynamic(
  () => import("./adobe-raster-viewer").then((m) => m.AdobeRasterViewer),
  { ssr: false, loading: LoadingPane }
);

const TextViewerRenderer: ComponentType<ViewerProps> = (props) => (
  <TextViewer {...props} variant="text" />
);
const CodeViewerRenderer: ComponentType<ViewerProps> = (props) => (
  <TextViewer {...props} variant="code" />
);

interface FileViewerProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: FileItem) => void;
}

const VIEWER_RENDERERS: Partial<
  Record<FileViewerType, ComponentType<ViewerProps>>
> = {
  image: ImageViewer,
  video: VideoViewer,
  audio: AudioViewer,
  office: OfficeViewer,
  pdf: PDFViewer,
  text: TextViewerRenderer,
  code: CodeViewerRenderer,
  "adobe-raster": AdobeRasterViewer,
};

const categoryLabels = new Map(
  FILE_TYPE_GROUPS.map((group) => [group.id, group.label] as const)
);

export function FileViewer({
  file,
  isOpen,
  onClose,
  onDownload,
}: FileViewerProps) {
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setViewerError(null);
    setAttempt((prev) => prev + 1);
  }, [file?.id, file?.blob_url]);

  const viewerType = useMemo<FileViewerType>(() => {
    if (!file) return "unsupported";
    return getFileViewerType(file.mime_type, file.name);
  }, [file]);

  const category = useMemo(() => {
    if (!file) return "other";
    return getFileCategory(file.mime_type, file.name);
  }, [file]);

  const categoryLabel = categoryLabels.get(category) ?? "File";
  const sizeLabel = file ? formatFileSize(file.size) : "";

  const handleDownload = useCallback(() => {
    if (!file) return;
    if (onDownload) {
      onDownload(file);
    } else {
      window.open(file.blob_url, "_blank", "noopener,noreferrer");
    }
  }, [file, onDownload]);

  const handleOpenExternal = useCallback(() => {
    if (!file) return;
    window.open(file.blob_url, "_blank", "noopener,noreferrer");
  }, [file]);

  const handleViewerError = useCallback((message: string) => {
    setViewerError(message);
  }, []);

  const handleRetry = useCallback(() => {
    setViewerError(null);
    setAttempt((prev) => prev + 1);
  }, []);

  if (!file) return null;

  const Renderer =
    viewerType === "unsupported" ? undefined : VIEWER_RENDERERS[viewerType];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="grid h-[92vh] w-[min(96vw,1100px)] grid-rows-[auto,1fr] gap-0 p-0 sm:max-w-none"
      >
        <DialogHeader className="border-b border-border px-4 py-2 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="truncate text-lg font-semibold">
                  {file.name}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{categoryLabel}</Badge>
                  <span>{sizeLabel}</span>

                  {file.mime_type && <span>{file.mime_type}</span>}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                aria-label="Close file preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content row must allow its child to own scrolling -> min-h-0/min-w-0 */}
        <div className="relative min-h-0 min-w-0 overflow-hidden bg-background">
          {viewerType === "unsupported" || !Renderer ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                Preview is not available for this file type yet. You can
                download or open it in a new tab instead.
              </p>
              <div className="flex items-center gap-2">
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={handleOpenExternal}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in new tab
                </Button>
              </div>
            </div>
          ) : viewerError ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  {viewerError}
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Try reloading the preview or open the original file in a new
                  tab.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry preview
                </Button>
                <Button variant="outline" onClick={handleOpenExternal}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open original
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={`${file.id}-${attempt}`}
              // Let the inner viewer own the scroll area
              className="h-full min-h-0 min-w-0 overflow-hidden"
            >
              <Renderer file={file} onError={handleViewerError} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
