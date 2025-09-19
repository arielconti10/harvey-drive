"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ChevronsUpDown,
  HardDrive,
  Home,
  LogOut,
  Pencil,
  Share2,
  Star,
  Trash2,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { DashboardView, Profile, Dataroom } from "@/lib/types";
import { useDatarooms } from "@/lib/hooks/use-datarooms";
import { useUiStore } from "@/lib/store/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DataroomNameDialog } from "./dataroom-name-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DashboardSidebarProps {
  user: User;
  profile: Profile | null;
  onNavigate: (view: DashboardView) => void;
  currentView: DashboardView;
}

export function DashboardSidebar({
  user,
  profile,
  onNavigate,
  currentView,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { datarooms, create, remove, rename, loading } = useDatarooms();
  const currentDataroomId = useUiStore((s) => s.currentDataroomId);
  const setCurrentDataroomId = useUiStore((s) => s.setCurrentDataroomId);
  const sortedRooms = useMemo(
    () =>
      [...datarooms].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [datarooms]
  );
  const activeRoom =
    sortedRooms.find((room) => room.id === currentDataroomId) ??
    sortedRooms[0] ??
    null;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [roomToRename, setRoomToRename] = useState<Dataroom | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Dataroom | null>(null);
  const hasLoadedRoomsRef = useRef(false);

  useEffect(() => {
    if (!currentDataroomId && sortedRooms.length > 0) {
      setCurrentDataroomId(sortedRooms[0].id);
    }
  }, [currentDataroomId, sortedRooms, setCurrentDataroomId]);

  useEffect(() => {
    if (sortedRooms.length === 0 && currentDataroomId) {
      setCurrentDataroomId(null);
    }
  }, [sortedRooms, currentDataroomId, setCurrentDataroomId]);

  const handleCreateDataroom = () => {
    setShowCreateDialog(true);
  };

  const openRenameDialog = (room: Dataroom) => {
    setRoomToRename(room);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (room: Dataroom) => {
    setRoomToDelete(room);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    if (loading) {
      return;
    }

    if (sortedRooms.length > 0) {
      hasLoadedRoomsRef.current = true;
      return;
    }

    if (!hasLoadedRoomsRef.current && !showCreateDialog) {
      setShowCreateDialog(true);
    }
  }, [loading, sortedRooms, showCreateDialog]);

  const handleDeleteDataroom = async () => {
    if (!roomToDelete) return;
    try {
      await remove(roomToDelete.id);
      toast.success("Dataroom deleted");
      if (roomToDelete.id === currentDataroomId) {
        setCurrentDataroomId(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete dataroom";
      toast.error(message);
    } finally {
      setDeleteDialogOpen(false);
      setRoomToDelete(null);
    }
  };

  const getInitials = (value?: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const primaryEmail = profile?.email || user.email || "";
  const displayName =
    profile?.full_name?.trim() ||
    (primaryEmail ? primaryEmail.split("@")[0] : "") ||
    "User";
  const displayEmail = primaryEmail;
  const avatarUrl = profile?.avatar_url || "";
  const avatarFallback =
    getInitials(profile?.full_name) || getInitials(primaryEmail) || "U";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const sidebarItems = (
    [
      {
        icon: Home,
        label: "My Files",
        view: "files" as const,
      },
      {
        icon: Star,
        label: "Starred",
        view: "starred" as const,
      },
      {
        icon: Share2,
        label: "Shared",
        view: "shared" as const,
      },
    ]
  ).map((item) => ({
    ...item,
    active: currentView === item.view,
  }));

  return (
    <div className="flex h-full w-full flex-col">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-border">
        <HardDrive className="h-8 w-8 text-foreground" />
        <span className="ml-2 text-xl font-bold text-foreground">
          HarveyDrive
        </span>
      </div>

      {sortedRooms.length > 0 && activeRoom ? (
        <div className="border-b border-border px-4 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      "justify-start"
                    )}
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg border bg-sidebar-primary text-sidebar-primary-foreground">
                      <HardDrive className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {activeRoom.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Dataroom
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  align="start"
                  side={isMobile ? "bottom" : "right"}
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                    Datarooms
                  </DropdownMenuLabel>
                  {sortedRooms.map((room) => (
                    <DropdownMenuItem
                      key={room.id}
                      onClick={() => setCurrentDataroomId(room.id)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border">
                        <HardDrive className="size-3.5" />
                      </div>
                      <span className="flex-1 truncate">{room.name}</span>
                      {room.id === currentDataroomId && (
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  {activeRoom && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                        Manage{" "}
                        <span className="font-medium text-foreground">
                          “{activeRoom.name}”
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        className="gap-2 p-2"
                        onClick={(event) => {
                          event.preventDefault();
                          openRenameDialog(activeRoom);
                        }}
                      >
                        <Pencil className="size-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="p-2 text-destructive focus:text-destructive"
                        onClick={(event) => {
                          event.preventDefault();
                          openDeleteDialog(activeRoom);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onClick={handleCreateDataroom}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <Plus className="size-4" />
                    </div>
                    <div className="font-medium">Create dataroom</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      ) : (
        <div className="border-b border-border px-4 py-6">
          <p className="text-sm text-muted-foreground mb-3">
            Create a dataroom to start organizing your files.
          </p>
          <Button onClick={handleCreateDataroom} className="w-full">
            <Plus className="h-4 w-4" />
            <span>Create dataroom</span>
          </Button>
        </div>
      )}
      <DataroomNameDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Create dataroom"
        description="Datarooms group folders and files for a workspace."
        confirmLabel="Create"
        initialName=""
        onSubmit={async (name) => {
          const created = await create(name);
          setCurrentDataroomId(created.id);
          toast.success("Dataroom created");
        }}
      />

      <DataroomNameDialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) setRoomToRename(null);
        }}
        title="Rename dataroom"
        description="Update the name so it's easier for your teammates to recognize."
        confirmLabel="Rename"
        initialName={roomToRename?.name ?? ""}
        onSubmit={async (name) => {
          if (!roomToRename) return;
          await rename(roomToRename.id, name);
          toast.success("Dataroom renamed");
          setRoomToRename(null);
        }}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setRoomToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dataroom?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the dataroom and all of its folders
              and files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteDataroom();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {sidebarItems.map((item) => (
          <Button
            key={item.view}
            variant={item.active ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onNavigate(item.view)}
          >
            <item.icon className="h-4 w-4 mr-3" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="border-t border-border pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="rounded-lg">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs">{displayEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="rounded-lg">
                        {avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {displayName}
                      </span>
                      <span className="truncate text-xs">{displayEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
