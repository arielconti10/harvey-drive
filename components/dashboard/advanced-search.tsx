"use client";

import { ChangeEvent } from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SearchFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  className?: string;
}

export function AdvancedSearch({
  filters,
  onFiltersChange,
  className,
}: AdvancedSearchProps) {
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, query: event.target.value });
  };

  const toggleFileType = (value: string, checked: boolean) => {
    const nextTypes = checked
      ? [...new Set([...filters.fileTypes, value])]
      : filters.fileTypes.filter((type) => type !== value);
    onFiltersChange({ ...filters, fileTypes: nextTypes });
  };

  const clearFileTypes = () => {
    onFiltersChange({ ...filters, fileTypes: [] });
  };

  const fileTypeOptions: Array<{ value: string; label: string }> = [
    { value: "image", label: "Images" },
    { value: "document", label: "Documents" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "archive", label: "Archives" },
  ];

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-2",
        "sm:flex-nowrap",
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input
          placeholder="Search files and folders..."
          value={filters.query}
          onChange={handleQueryChange}
          className="pl-10"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative shrink-0"
          >
            <Filter />
            <span className="sr-only">File type filters</span>
            {filters.fileTypes.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>File types</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {fileTypeOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.fileTypes.includes(option.value)}
              onCheckedChange={(checked) =>
                toggleFileType(option.value, Boolean(checked))
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          {filters.fileTypes.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={clearFileTypes}
                className="text-muted-foreground"
              >
                Clear filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {filters.fileTypes.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFileTypes}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
