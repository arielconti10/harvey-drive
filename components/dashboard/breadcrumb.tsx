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
import { Fragment, useMemo } from "react";
import type { DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  buildFolderPathQueryKey,
  fetchFolderPath,
} from "@/lib/api/file-queries";

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
};

export function Breadcrumb({
  currentFolderId,
  onNavigate,
  onFileMove,
  className,
}: BreadcrumbProps) {
  const specialLabel = currentFolderId
    ? SPECIAL_VIEWS[currentFolderId]
    : undefined;

  const { data: pathData, isLoading, isError } = useQuery({
    queryKey: currentFolderId
      ? buildFolderPathQueryKey(currentFolderId)
      : ["folderPath", { folderId: null }],
    queryFn: () => fetchFolderPath(currentFolderId as string),
    enabled: Boolean(currentFolderId && !specialLabel),
    staleTime: 30_000,
  });

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const base = [{ id: null, name: "My Files" }];
    if (!currentFolderId) return base;

    if (specialLabel) {
      return [...base, { id: currentFolderId, name: specialLabel }];
    }

    if (isLoading) {
      return [...base, { id: currentFolderId, name: "Loading…" }];
    }

    if (isError || !pathData || pathData.length === 0) {
      return [...base, { id: currentFolderId, name: "Current Folder" }];
    }

    return [...base, ...pathData];
  }, [currentFolderId, pathData, isError, isLoading, specialLabel]);

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
