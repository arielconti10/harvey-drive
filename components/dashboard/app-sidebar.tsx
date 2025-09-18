"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import type { User } from "@supabase/supabase-js";
import type { DashboardView, Profile } from "@/lib/types";
import { useUiStore } from "@/lib/store/ui";

interface AppSidebarProps {
  user: User;
  profile: Profile | null;
}

export function AppSidebar({ user, profile }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const setCurrentFolderId = useUiStore((s) => s.setCurrentFolderId);
  const currentView = useMemo<DashboardView>(() => {
    if (!pathname) return "files";
    if (pathname.startsWith("/dashboard/starred")) return "starred";
    if (pathname.startsWith("/dashboard/shared")) return "shared";
    if (pathname.startsWith("/dashboard/trash")) return "trash";
    return "files";
  }, [pathname]);

  const handleNavigate = (nextView: DashboardView) => {
    setCurrentFolderId(null);
    const targetPath =
      nextView === "files" ? "/dashboard" : `/dashboard/${nextView}`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  };
  return (
    <Sidebar variant="inset">
      <SidebarContent>
        <DashboardSidebar
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
          currentView={currentView}
        />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
