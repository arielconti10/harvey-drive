"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, WrapText } from "lucide-react";
import type { FileItem } from "@/lib/types";
import { getFileExtension } from "@/lib/utils/file-utils";

interface TextViewerProps {
  file: FileItem;
  onError: (error: string) => void;
  variant?: "text" | "code";
  languageHint?: string | null;
}

const LARGE_FILE_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_PREVIEW_CHARACTERS = 200_000;

export function TextViewer({
  file,
  onError,
  variant = "text",
  languageHint,
}: TextViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [wrapEnabled, setWrapEnabled] = useState(variant === "text");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [isTruncated, setIsTruncated] = useState(false);

  const extension = useMemo(() => getFileExtension(file.name), [file.name]);
  const languageLabel = useMemo(() => {
    if (languageHint) return languageHint;
    if (!extension) return variant === "code" ? "code" : "text";
    return extension;
  }, [extension, languageHint, variant]);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const fetchTextContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(file.blob_url, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch file");

        const reader = response.body?.getReader();

        if (!reader) {
          let text = await response.text();
          const truncated = text.length > MAX_PREVIEW_CHARACTERS;
          if (truncated) {
            text = `${text.slice(0, MAX_PREVIEW_CHARACTERS)}\n\n… Preview truncated`;
          }
          if (!isCancelled) {
            setContent(text);
            setIsTruncated(truncated);
          }
          return;
        }

        const decoder = new TextDecoder();
        let text = "";
        let truncated = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          if (text.length >= MAX_PREVIEW_CHARACTERS) {
            text = `${text.slice(0, MAX_PREVIEW_CHARACTERS)}\n\n… Preview truncated`;
            truncated = true;
            controller.abort();
            break;
          }
        }

        text += decoder.decode();

        if (!isCancelled) {
          setContent(text);
          setIsTruncated(truncated);
        }
      } catch (error) {
        if (isCancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch text file:", error);
        onError("Failed to load text file");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchTextContent();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [file.blob_url, onError]);

  useEffect(() => {
    if (copyStatus === "copied") {
      const timer = setTimeout(() => setCopyStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [copyStatus]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("copied");
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const lineCount = useMemo(() => content.split(/\r?\n/).length, [content]);
  const charCount = content.length;
  const isLargeFile = file.size > LARGE_FILE_THRESHOLD_BYTES;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ring)] border-t-transparent" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">No previewable text content.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {languageLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {lineCount} lines · {charCount.toLocaleString()} characters
          </p>
          {(isLargeFile || isTruncated) && (
            <p className="text-xs text-muted-foreground">
              Preview truncated for large file performance.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWrapEnabled((prev) => !prev)}
            aria-pressed={wrapEnabled}
          >
            <WrapText className="h-4 w-4" />
            {wrapEnabled ? "No Wrap" : "Wrap"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            {copyStatus === "copied" ? "Copied" : "Copy"}
          </Button>
          <span className="sr-only" aria-live="polite" role="status">
            {copyStatus === "copied" ? "Text copied to clipboard" : ""}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-card">
        <pre
          className={"p-6 text-sm"}
          style={{
            fontFamily: "Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            whiteSpace: wrapEnabled ? "pre-wrap" : "pre",
            wordBreak: wrapEnabled ? "break-word" : "normal",
          }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}
