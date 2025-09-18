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
import { Button } from "@/components/ui/button";

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

const SPECIAL_VIEWS: Record<string, string> = {
  starred: "Starred",
  shared: "Shared",
  trash: "Trash",
};

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

      const specialLabel = SPECIAL_VIEWS[currentFolderId];
      if (specialLabel) {
        if (isActive) {
          setBreadcrumbs([
            { id: null, name: "My Files" },
            { id: currentFolderId, name: specialLabel },
          ]);
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
      <BreadcrumbRoot className="overflow-x-auto">
        <BreadcrumbList className="!flex-nowrap items-center gap-1.5 whitespace-nowrap">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isRoot = index === 0;

            return (
              <Fragment key={item.id ?? "root"}>
                <BreadcrumbItem className="min-w-0">
                  {isLast ? (
                    <BreadcrumbPage
                      className="flex min-w-0 items-center gap-1.5"
                      title={item.name}
                      onDragOver={(event) => handleDragOver(event)}
                      onDrop={(event) => handleDrop(event, item.id)}
                    >
                      {isRoot && <Home className="h-4 w-4" />}
                      <span className="max-w-[140px] truncate text-left text-sm sm:max-w-[220px]">
                        {item.name}
                      </span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        title={item.name}
                        onDragOver={(event) => handleDragOver(event)}
                        onDrop={(event) => handleDrop(event, item.id)}
                      >
                        {isRoot && <Home className="h-4 w-4" />}
                        <span className="max-w-[140px] truncate text-left sm:max-w-[220px]">
                          {item.name}
                        </span>
                      </Button>
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
