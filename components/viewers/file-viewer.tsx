"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";
import type { FileItem } from "@/lib/types";
import { PDFViewer } from "./pdf-viewer";
import { OfficeViewer } from "./office-viewer";
import { ImageViewer } from "./image-viewer";
import { TextViewer } from "./text-viewer";
import { VideoViewer } from "./video-viewer";
import {
  isPDFFile,
  isOfficeFile,
  isImageFile,
  isVideoFile,
} from "@/lib/utils/file-utils";

interface FileViewerProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: FileItem) => void;
}

export function FileViewer({
  file,
  isOpen,
  onClose,
  onDownload,
}: FileViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (file && isOpen) {
      setLoading(true);
      setError(null);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        loadingTimeoutRef.current = null;
      }, 500);
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [file, isOpen]);

  if (!file) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file);
    } else {
      window.open(file.blob_url, "_blank");
    }
  };

  const handleOpenExternal = () => {
    window.open(file.blob_url, "_blank");
  };

  const renderViewer = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ring)]"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleOpenExternal} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </Button>
        </div>
      );
    }

    if (isPDFFile(file?.mime_type)) {
      return <PDFViewer file={file} onError={setError} />;
    }

    if (isOfficeFile(file?.mime_type)) {
      return <OfficeViewer file={file} onError={setError} />;
    }

    if (isImageFile(file?.mime_type)) {
      return <ImageViewer file={file} onError={setError} />;
    }

    if (isVideoFile(file?.mime_type)) {
      return <VideoViewer file={file} onError={setError} />;
    }

    if (file?.mime_type?.startsWith("text/")) {
      return <TextViewer file={file} onError={setError} />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-muted-foreground mb-4">
          Preview not available for this file type
        </p>
        <Button onClick={handleOpenExternal} variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in new tab
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-6xl h-[90vh] p-0 grid grid-rows-[auto,1fr]"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {file.name}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="h-full overflow-hidden">{renderViewer()}</div>
      </DialogContent>
    </Dialog>
  );
}
