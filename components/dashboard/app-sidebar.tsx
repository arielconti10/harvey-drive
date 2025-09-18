"use client";

import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { useUiStore } from "@/lib/store/ui";

interface AppSidebarProps {
  user: User;
  profile: Profile | null;
}

export function AppSidebar({ user, profile }: AppSidebarProps) {
  const currentFolderId = useUiStore((s) => s.currentFolderId);
  const setCurrentFolderId = useUiStore((s) => s.setCurrentFolderId);
  const handleNavigate = (folderId: string | null) =>
    setCurrentFolderId(folderId);
  return (
    <Sidebar variant="inset">
      <SidebarContent>
        <DashboardSidebar
          user={user}
          profile={profile}
          onNavigate={handleNavigate}
          currentFolderId={currentFolderId}
        />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
