// components/viewers/pdf-viewer.tsx
"use client";

import dynamic from "next/dynamic";
import type { PDFViewerProps } from "./pdf-viewer-inner";

const LoadingPane = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ring)] border-t-transparent" />
  </div>
);

const PdfViewerInner = dynamic(
  () => import("./pdf-viewer-inner").then((m) => m.PdfViewerInner),
  { ssr: false, loading: LoadingPane }
);

export function PDFViewer(props: PDFViewerProps) {
  return <PdfViewerInner {...props} />;
}
