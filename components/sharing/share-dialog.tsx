"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Link2, Loader2, Trash2 } from "lucide-react";
import type { FileItem } from "@/lib/types";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface ShareDialogProps {
  files: FileItem[];
  isOpen: boolean;
  onClose: () => void;
}

interface Share {
  id: string;
  permission: "view" | "edit";
  share_token: string | null;
  expires_at: string | null;
  created_at: string;
}

export function ShareDialog({ files, isOpen, onClose }: ShareDialogProps) {
  const file = files[0] ?? null;

  const [shares, setShares] = useState<Share[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("");
  const [isFetching, setIsFetching] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invalidateSharedFiles = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        if (!Array.isArray(query.queryKey) || query.queryKey[0] !== "files") {
          return false;
        }

        const meta = query.queryKey[1];
        if (meta && typeof meta === "object") {
          try {
            const view = (meta as { view?: string }).view;
            return view === "shared";
          } catch {
            return false;
          }
        }
        return false;
      },
    });
  }, [queryClient]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShares([]);
      setCopiedLink(null);
      setLinkPending(false);
      setDeletingId(null);
      return;
    }

    if (!file) {
      onClose();
    }
  }, [isOpen, file, onClose]);

  const fetchShares = useCallback(async () => {
    if (!file) return;

    setIsFetching(true);
    try {
      const response = await fetch(`/api/files/share?fileId=${file.id}`);
      if (response.ok) {
        const data = await response.json();
        setShares(Array.isArray(data.shares) ? data.shares : []);
      }
    } catch (error) {
      console.error("Failed to fetch shares", error);
    } finally {
      setIsFetching(false);
      setDeletingId(null);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      void fetchShares();
    }
  }, [isOpen, file, fetchShares]);

  const publicShare = useMemo(
    () => shares.find((share) => share.share_token),
    [shares]
  );

  const shareUrl = useMemo(() => {
    if (!publicShare?.share_token) return "";
    if (publicShare.share_token.startsWith("http")) {
      return publicShare.share_token;
    }
    return `${origin.replace(/\/$/, "")}/shared/${publicShare.share_token}`;
  }, [origin, publicShare]);

  const handleCreatePublicLink = async () => {
    if (!file) return;
    setLinkPending(true);
    try {
      const response = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, createPublicLink: true }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to create public link");
      }

      await fetchShares();
      invalidateSharedFiles();
    } catch (error) {
      console.error(error);
    } finally {
      setLinkPending(false);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!file) return;
    setDeletingId(shareId);
    try {
      const response = await fetch("/api/files/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to delete share link");
      }
      await fetchShares();
      invalidateSharedFiles();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(publicShare?.share_token ?? null);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error("Clipboard copy failed", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {file ? `Share “${file.name}”` : "Share"}
          </DialogTitle>
          <DialogDescription>
            Generate a link to give read-only access to this file.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <p className="text-sm text-muted-foreground">
            No file selected.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {format(new Date(file.created_at), "PPpp")}
                  </p>
                </div>
                <Badge variant="secondary">{file.mime_type || "Unknown type"}</Badge>
              </div>
            </div>

            <Separator />

            {isFetching ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading share link…
              </div>
            ) : publicShare ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  Anyone with this link can view the file.
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="share-url"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" aria-hidden="true" /> Copy
                      </>
                    )}
                  </Button>
                </div>

                {publicShare.expires_at ? (
                  <p className="text-xs text-muted-foreground">
                    Expires {format(new Date(publicShare.expires_at), "PPpp")}.
                  </p>
                ) : null}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteShare(publicShare.id)}
                  disabled={deletingId === publicShare.id}
                  className="w-fit"
                >
                  {deletingId === publicShare.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="ml-2">Delete public link</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  No public link has been created yet. Generate one to let
                  anyone with the URL view this file.
                </p>
                <Button onClick={handleCreatePublicLink} disabled={linkPending}>
                  {linkPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create shareable link
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
