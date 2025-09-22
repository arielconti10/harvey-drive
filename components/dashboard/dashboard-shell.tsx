"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { AppSidebar } from "./app-sidebar";

interface DashboardShellProps {
  user: User;
  profile: Profile | null;
  children: ReactNode;
}

export function DashboardShell({
  user,
  profile,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <AppSidebar user={user} profile={profile} />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
