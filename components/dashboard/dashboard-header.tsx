"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb } from "./breadcrumb";

interface DashboardHeaderProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  onFileMove?: (fileId: string, targetFolderId: string | null) => void;
}

export function DashboardHeader({
  currentFolderId,
  onNavigate,
  onFileMove,
}: DashboardHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-3 sm:gap-2 sm:px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex-1" data-testid="header-title">
          <Breadcrumb
            currentFolderId={currentFolderId}
            onNavigate={onNavigate}
            onFileMove={onFileMove}
            className="flex-1 px-0 py-0"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
