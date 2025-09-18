"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface OfficeViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function OfficeViewer({ file, onError }: OfficeViewerProps) {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoading(true);
  }, [file.blob_url]);

  const officeOnlineUrl = useMemo(() => {
    const encodedUrl = encodeURIComponent(file.blob_url);

    const mime = (file.mime_type || "").toLowerCase();
    const ext = (file.name?.split(".").pop() || "").toLowerCase();

    const officeExtensions = new Set([
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
    ]);
    const looksLikeOfficeByExt = officeExtensions.has(ext);
    const looksLikeOfficeByMime =
      mime.includes("word") ||
      mime.includes("excel") ||
      mime.includes("powerpoint") ||
      mime.includes("officedocument") ||
      mime.includes("msword") ||
      mime.includes("ms-excel") ||
      mime.includes("ms-powerpoint") ||
      mime.includes("presentation") ||
      mime.includes("sheet") ||
      mime.includes("document");

    if (looksLikeOfficeByExt || looksLikeOfficeByMime) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    }

    return null;
  }, [file.blob_url, file.mime_type, file.name]);

  useEffect(() => {
    if (!officeOnlineUrl) {
      onError("Unsupported Office document format");
    }
  }, [officeOnlineUrl, onError]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    onError(
      "Failed to load Office document. The file might be corrupted or the format is not supported."
    );
  };

  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenExternal = () => {
    if (officeOnlineUrl) {
      window.open(officeOnlineUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!officeOnlineUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-muted-foreground mb-4">
          Unable to generate preview for this Office document
        </p>
        <Button
          onClick={() => window.open(file.blob_url, "_blank", "noopener,noreferrer")}
          variant="outline"
        >
          <ExternalLink className="h-4 w-4" />
          Download to view
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Office Viewer Controls */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Office Online Viewer
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Reload Office document"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4" />
            Open in Office Online
          </Button>
        </div>
      </div>

      {/* Office Document Viewer */}
      <div className="flex-1 relative bg-secondary">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ring)]"></div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={officeOnlineUrl}
          className="w-full h-full border-0"
          title={file.name}
          referrerPolicy="no-referrer"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          allowFullScreen
        />
      </div>
    </div>
  );
}
