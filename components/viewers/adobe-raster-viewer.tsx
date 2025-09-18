"use client";

import { useEffect, useMemo, useState } from "react";
import type { Psd, Layer } from "ag-psd";
import type { FileItem } from "@/lib/types";
import { getFileExtension } from "@/lib/utils/file-utils";

interface AdobeRasterViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

function findFirstCanvas(node: Psd | Layer): HTMLCanvasElement | undefined {
  const maybeCanvas = (node as Psd & Layer).canvas as
    | HTMLCanvasElement
    | undefined;
  if (maybeCanvas) {
    return maybeCanvas;
  }

  if (!("children" in node) || !node.children) return undefined;

  for (const child of node.children) {
    const canvas = findFirstCanvas(child as Layer);
    if (canvas) return canvas;
  }

  return undefined;
}

export function AdobeRasterViewer({ file, onError }: AdobeRasterViewerProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extension = useMemo(() => getFileExtension(file.name), [file.name]);
  const extensionLabel = extension ? extension.toUpperCase() : "PSD";

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;
    let objectUrl: string | null = null;

    const loadPsd = async () => {
      setLoading(true);
      setImageDataUrl(null);

      try {
        const response = await fetch(file.blob_url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch PSD file: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const { readPsd } = await import("ag-psd");
        const psd = readPsd(buffer, {
          skipLayerImageData: true,
          skipCompositeImageData: false,
          skipThumbnail: true,
        });

        const canvas = findFirstCanvas(psd);

        if (!canvas) {
          throw new Error("No raster data available in PSD");
        }

        await new Promise<void>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob failed"));
              return;
            }
            objectUrl = URL.createObjectURL(blob);
            if (!isCancelled) {
              setImageDataUrl(objectUrl);
            }
            resolve();
          }, "image/png");
        });
      } catch (error) {
        if (!isCancelled) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          console.error("Failed to render PSD file", error);
          onError("Failed to render Adobe raster file");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadPsd();

    return () => {
      isCancelled = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file.blob_url, onError]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ring)] border-t-transparent" />
          <p className="text-sm">Rendering {extensionLabel} preview…</p>
        </div>
      </div>
    );
  }

  if (!imageDataUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Unable to generate an inline preview for this Adobe file. Try downloading the
          original instead.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-secondary">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {extensionLabel} preview
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex min-h-full min-w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt={file.name}
            loading="eager"
            decoding="async"
            draggable={false}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
