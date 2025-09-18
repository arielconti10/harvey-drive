"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/file-utils";
import {
  ACCEPT_FILE_TYPES_ATTRIBUTE,
  MAX_FILE_SIZE_BYTES,
  isAllowedFileType,
} from "@/lib/constants/files";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onBatchStart?: (count: number) => void;
  onFileUploaded?: (index: number, total: number) => void;
  onBatchEnd?: (succeeded: boolean) => void;
  className?: string;
}

export function FileUploadZone({
  onUpload,
  onComplete,
  onError,
  onBatchStart,
  onFileUploaded,
  onBatchEnd,
  className,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelection = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      const invalidEntries: UploadFile[] = [];
      const validEntries: UploadFile[] = [];

      for (const file of fileArray) {
        const baseEntry: UploadFile = {
          file,
          id: Math.random().toString(36).slice(2, 11),
          progress: 0,
          status: "pending",
        };

        if (file.size > MAX_FILE_SIZE_BYTES) {
          const message = `"${file.name}" exceeds the 50 MB limit.`;
          invalidEntries.push({ ...baseEntry, status: "error", error: message });
          onError?.(new Error(message));
          continue;
        }

        if (!isAllowedFileType(file.type, file.name)) {
          const message = `"${file.name}" has an unsupported type.`;
          invalidEntries.push({ ...baseEntry, status: "error", error: message });
          onError?.(new Error(message));
          continue;
        }

        validEntries.push(baseEntry);
      }

      const combinedEntries = [...invalidEntries, ...validEntries];
      setUploadFiles(combinedEntries);

      if (validEntries.length === 0) {
        onBatchEnd?.(false);
        return;
      }

      setIsUploading(true);
      onBatchStart?.(validEntries.length);

      let encounteredError = invalidEntries.length > 0;
      let processed = 0;

      try {
        for (const uploadFile of validEntries) {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "uploading" } : f
            )
          );

          let progressInterval: ReturnType<typeof setInterval> | null = null;

          try {
            progressInterval = setInterval(() => {
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id && f.progress < 90
                    ? { ...f, progress: f.progress + Math.random() * 20 }
                    : f
                )
              );
            }, 200);

            await onUpload(uploadFile.file);

            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, progress: 100, status: "completed" }
                  : f
              )
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Upload failed";
            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? {
                      ...f,
                      status: "error",
                      error: message,
                    }
                  : f
              )
            );
            onError?.(new Error(message));
            encounteredError = true;
          } finally {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
            processed += 1;
            onFileUploaded?.(processed, validEntries.length);
          }
        }
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadFiles([]), 3000);
        if (!encounteredError) {
          onComplete?.();
        }
        onBatchEnd?.(!encounteredError);
      }
    }, [
      onUpload,
      onBatchStart,
      onFileUploaded,
      onComplete,
      onBatchEnd,
      onError,
    ]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        void handleFileSelection(files);
      }
    },
    [handleFileSelection]
  );

  const removeUploadFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className={className}>
      {/* Upload Zone */}
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8",
          isDragOver
            ? "border-ring bg-accent/20"
            : "border-border hover:border-ring"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="mb-2 text-base font-medium sm:text-lg">
          Drop files here to upload
        </h3>
        <p className="mb-4 text-sm text-muted-foreground sm:text-base">
          or click to browse your computer
        </p>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_FILE_TYPES_ATTRIBUTE}
          onChange={(e) =>
            e.target.files && void handleFileSelection(e.target.files)
          }
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-medium">Uploading files...</h4>
          {uploadFiles.map((uploadFile) => (
            <Card key={uploadFile.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {uploadFile.status === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {uploadFile.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {uploadFile.status === "uploading" && (
                      <div className="h-5 w-5 border-2 border-[var(--ring)] border-t-transparent rounded-full animate-spin" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadFile(uploadFile.id)}
                    disabled={uploadFile.status === "uploading"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {uploadFile.status === "uploading" && (
                  <Progress value={uploadFile.progress} className="h-2" />
                )}
                {uploadFile.status === "error" && (
                  <p className="text-sm text-red-600">{uploadFile.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
