"use client";

import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import type { DragEvent } from "react";
import { cn } from "@/lib/utils";

interface BreadcrumbProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  onFileMove?: (fileId: string, targetFolderId: string | null) => void;
  className?: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export function Breadcrumb({
  currentFolderId,
  onNavigate,
  onFileMove,
  className,
}: BreadcrumbProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "My Files" },
  ]);

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    async function loadBreadcrumbs() {
      if (!currentFolderId) {
        if (isActive) {
          setBreadcrumbs([{ id: null, name: "My Files" }]);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/folders/path?folderId=${currentFolderId}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load folder path");
        }

        const data = await response.json();
        const path = Array.isArray(data.path) ? data.path : [];

        const items =
          path.length > 0
            ? path.map((item: { id: string; name: string }) => ({
                id: item.id,
                name: item.name,
              }))
            : [{ id: currentFolderId, name: "Current Folder" }];

        if (isActive) {
          setBreadcrumbs([{ id: null, name: "My Files" }, ...items]);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        console.error("Failed to fetch breadcrumb path", error);
        if (isActive) {
          setBreadcrumbs([
            { id: null, name: "My Files" },
            { id: currentFolderId, name: "Current Folder" },
          ]);
        }
      }
    }

    loadBreadcrumbs();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [currentFolderId]);

  const handleDragOver = (event: DragEvent) => {
    if (!onFileMove) return;
    if (!event.dataTransfer.types.includes("application/x-file-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent, targetId: string | null) => {
    if (!onFileMove) return;
    const fileId = event.dataTransfer.getData("application/x-file-id");
    if (!fileId) return;
    event.preventDefault();
    event.stopPropagation();
    onFileMove(fileId, targetId);
  };

  return (
    <div className={cn("px-6 py-3", className)}>
      <BreadcrumbRoot>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isRoot = index === 0;

            return (
              <Fragment key={item.id ?? "root"}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage
                      className="flex items-center gap-1.5 text-gray-900 dark:text-white"
                      onDragOver={(event) => handleDragOver(event)}
                      onDrop={(event) => handleDrop(event, item.id)}
                    >
                      {isRoot && <Home className="h-4 w-4" />}
                      {item.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-700/70 dark:hover:text-white"
                        onDragOver={(event) => handleDragOver(event)}
                        onDrop={(event) => handleDrop(event, item.id)}
                      >
                        {isRoot && <Home className="h-4 w-4" />}
                        {item.name}
                      </button>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </BreadcrumbRoot>
    </div>
  );
}
