"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { FileItem } from "@/lib/types";

interface TextViewerProps {
  file: FileItem;
  onError: (error: string) => void;
}

export function TextViewer({ file, onError }: TextViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTextContent = async () => {
      try {
        const response = await fetch(file.blob_url);
        if (!response.ok) throw new Error("Failed to fetch file");

        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("Failed to fetch text file:", error);
        onError("Failed to load text file");
      } finally {
        setLoading(false);
      }
    };

    fetchTextContent();
  }, [file, onError]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ring)]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Text Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">{file.name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex-1 overflow-auto p-6 bg-card">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}
