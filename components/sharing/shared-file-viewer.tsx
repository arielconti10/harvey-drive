"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, HardDrive, Clock, User } from "lucide-react";
import type { FileItem } from "@/lib/types";
import { formatFileSize, canPreview } from "@/lib/utils/file-utils";
import { format, isValid, parseISO } from "date-fns";
import { FileViewer } from "../viewers/file-viewer";

interface SharedFileViewerProps {
  file: FileItem & {
    profiles: {
      full_name: string | null;
      email: string | null;
    };
  };
  permission: "view" | "edit";
  expiresAt: string | null;
}

export function SharedFileViewer({
  file,
  permission,
  expiresAt,
}: SharedFileViewerProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const handleDownload = () => {
    try {
      const anchor = document.createElement("a");
      anchor.href = file.blob_url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDownloadFailed(false);
    } catch {
      setDownloadFailed(true);
      window.open(file.blob_url, "_blank", "noopener,noreferrer");
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const createdAtDate = new Date(file.created_at);
  const expiresAtDate = expiresAt ? parseISO(expiresAt) : null;
  const hasValidCreated = isValid(createdAtDate);
  const hasValidExpires = Boolean(expiresAtDate && isValid(expiresAtDate));

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-8 w-8 text-foreground" />
            <div>
              <h1 className="text-xl font-serif">HarveyDrive</h1>
              <p className="text-sm text-muted-foreground">Shared file</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="text-2xl">
                {file.mime_type.startsWith("image/") ? "🖼️" : "📄"}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{file.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Shared by {file.profiles.full_name || file.profiles.email}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-accent rounded">
                  <User className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Size</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-accent rounded">
                  <Clock className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {hasValidCreated
                      ? format(createdAtDate, "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
              </div>
              {hasValidExpires && expiresAtDate && (
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-accent rounded">
                    <Clock className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Expires</p>
                    <p className="text-sm text-muted-foreground">
                      {format(expiresAtDate, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {canPreview(file.mime_type, file.name) && (
                <Button onClick={handlePreview} className="flex-1">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              )}
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
            {downloadFailed && (
              <p className="text-sm text-destructive">
                We opened the file in a new tab because the download could not be triggered automatically.
              </p>
            )}

            {/* Permission Info */}
            <div className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                You have <span className="font-medium">{permission}</span>{" "}
                access to this file.
                {hasValidExpires && expiresAtDate && (
                  <>
                    {" "}
                    This link expires on{" "}
                    {format(expiresAtDate, "MMMM d, yyyy 'at' h:mm a")}.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* File Viewer */}
      <FileViewer
        file={file}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onDownload={handleDownload}
      />
    </div>
  );
}
