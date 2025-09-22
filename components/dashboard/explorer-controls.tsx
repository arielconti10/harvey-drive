"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FolderPlus,
  Grid3X3,
  List,
  TreePine,
  SortAsc,
  SortDesc,
  MoreVertical,
} from "lucide-react";
import { AdvancedSearch } from "./advanced-search";
import type {
  ViewMode,
  SortBy,
  SortOrder,
  SearchFilters,
  DashboardView,
} from "@/lib/types";
import { ACCEPT_FILE_TYPES_ATTRIBUTE } from "@/lib/constants/files";
import { format } from "date-fns";

interface ExplorerControlsProps {
  searchFilters: SearchFilters;
  onSearchFiltersChange: (filters: SearchFilters) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sort: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onUpload: (files: FileList) => Promise<void>;
  onCreateFolder: (name: string) => void;
  onShowUploadZone: () => void;
  canCreate?: boolean;
  defaultSortBy: SortBy;
  defaultSortOrder: SortOrder;
  onReset: () => void;
  view?: DashboardView;
}

export function ExplorerControls({
  searchFilters,
  onSearchFiltersChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
  onSortOrderChange,
  onUpload,
  onCreateFolder,
  onShowUploadZone,
  canCreate = true,
  defaultSortBy,
  defaultSortOrder,
  onReset,
  view = "files",
}: ExplorerControlsProps) {
  const [folderName, setFolderName] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void onUpload(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      setFolderName("");
      setCreateFolderOpen(false);
    }
  };

  const getViewIcon = (mode: ViewMode) => {
    switch (mode) {
      case "grid":
        return <Grid3X3 />;
      case "list":
        return <List />;
      case "tree":
        return <TreePine />;
    }
  };

  const hasActiveFilters =
    searchFilters.query.trim().length > 0 ||
    searchFilters.fileTypes.length > 0 ||
    sortBy !== defaultSortBy ||
    sortOrder !== defaultSortOrder;

  const filterBadges: string[] = [];
  if (searchFilters.query.trim()) {
    filterBadges.push(`Search: "${searchFilters.query.trim()}"`);
  }
  if (searchFilters.fileTypes.length > 0) {
    filterBadges.push(`Types: ${searchFilters.fileTypes.join(", ")}`);
  }
  if (searchFilters.sizeRange) {
    const parts = [] as string[];
    if (searchFilters.sizeRange.min != null) {
      parts.push(`≥ ${Math.round(searchFilters.sizeRange.min / 1024)} KB`);
    }
    if (searchFilters.sizeRange.max != null) {
      parts.push(`≤ ${Math.round(searchFilters.sizeRange.max / 1024)} KB`);
    }
    if (parts.length > 0) {
      filterBadges.push(`Size: ${parts.join(" · ")}`);
    }
  }
  if (searchFilters.dateRange?.from || searchFilters.dateRange?.to) {
    const from = searchFilters.dateRange.from
      ? format(new Date(searchFilters.dateRange.from), "MMM d, yyyy")
      : "";
    const to = searchFilters.dateRange.to
      ? format(new Date(searchFilters.dateRange.to), "MMM d, yyyy")
      : "";
    const label = [from, to].filter(Boolean).join(" – ");
    if (label) {
      filterBadges.push(`Date: ${label}`);
    }
  }

  const sortLabels: Record<SortBy, string> = {
    name: "Name",
    date: "Date",
    size: "Size",
    type: "Type",
  };

  const sortDescription = sortBy
    ? `${sortLabels[sortBy] ?? sortBy} · ${sortOrder === "asc" ? "Asc" : "Desc"}`
    : null;

  const defaultSortLabel = sortLabels[defaultSortBy] ?? defaultSortBy ?? "Name";
  const defaultSortDirection = defaultSortOrder === "desc" ? "Desc" : "Asc";

  const viewLabels: Record<ViewMode, string> = {
    grid: "Grid",
    list: "List",
    tree: "Tree",
  };

  const showCreationMenu = view === "files";

  return (
    <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:max-w-3xl">
          <AdvancedSearch
            filters={searchFilters}
            onFiltersChange={onSearchFiltersChange}
            className="w-full"
          />
          {filterBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filterBadges.map((badge) => (
                <Badge key={badge} variant="secondary">
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {getViewIcon(viewMode)}
                <span className="hidden sm:inline">View: {viewLabels[viewMode]}</span>
                <span className="sr-only sm:hidden">View: {viewLabels[viewMode]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onViewModeChange("grid")}>
                <Grid3X3 />
                Grid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange("list")}>
                <List />
                List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange("tree")}>
                <TreePine />
                Tree
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {sortOrder === "asc" ? <SortAsc /> : <SortDesc />}
                <span className="ml-1">
                  Sort: {sortDescription ?? `${defaultSortLabel} · ${defaultSortDirection}`}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onSortChange("name")}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange("date")}>
                Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange("size")}>
                Size
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange("type")}>
                Type
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                {sortOrder === "asc" ? "Descending" : "Ascending"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {showCreationMenu ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <MoreVertical />
                    New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    disabled={!canCreate}
                    onClick={() => canCreate && fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canCreate}
                    onClick={() => canCreate && onShowUploadZone()}
                  >
                    <Upload className="h-4 w-4" />
                    Open Upload Zone
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canCreate}
                    onClick={() => canCreate && setCreateFolderOpen(true)}
                    data-testid="btn-new-folder"
                  >
                    <FolderPlus className="h-4 w-4" />
                    New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_FILE_TYPES_ATTRIBUTE}
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-upload"
              />
            </>
          ) : (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {view === "shared"
                ? "Shared view lists files you've shared or received. Manage share links from the file menu."
                : "Starred view is read-only. Use the file menu to add or remove stars."}
            </span>
          )}
        </div>
      </div>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Name the folder you want to add to the current location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
