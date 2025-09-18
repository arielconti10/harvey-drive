"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Link2,
  Mail,
  Trash2,
  Eye,
  Edit,
  Clock,
  Check,
  Loader2,
} from "lucide-react";
import type { FileItem } from "@/lib/types";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  shared_with_id: string | null;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const inviteSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  permission: z.enum(["view", "edit"]),
  expiresAt: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      "Enter a valid expiration date"
    ),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export function ShareDialog({ files, isOpen, onClose }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [origin, setOrigin] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      permission: "view",
      expiresAt: "",
    },
  });

  const file = files[activeIndex] ?? null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchShares = useCallback(async () => {
    if (!file) return;

    setIsFetching(true);
    try {
      const response = await fetch(`/api/files/share?fileId=${file.id}`);
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      }
    } catch (error) {
      console.error("Failed to fetch shares:", error);
    } finally {
      setIsFetching(false);
      setDeletingId(null);
    }
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
      setShares([]);
      inviteForm.reset({ email: "", permission: "view", expiresAt: "" });
      inviteForm.clearErrors();
      return;
    }

    if (files.length === 0) {
      onClose();
      return;
    }

    if (activeIndex >= files.length) {
      setActiveIndex(0);
    }
  }, [files, activeIndex, isOpen, onClose, inviteForm]);

  useEffect(() => {
    if (file && isOpen) {
      void fetchShares();
    }
  }, [file, fetchShares, isOpen]);

  const handleInviteSubmit = async (values: InviteFormValues) => {
    if (!file) {
      inviteForm.setError("root", {
        type: "manual",
        message: "Select a file to share",
      });
      return;
    }

    inviteForm.clearErrors("root");

    try {
      const response = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          sharedWithEmail: values.email.trim(),
          permission: values.permission,
          expiresAt: values.expiresAt ? values.expiresAt : null,
        }),
      });

      if (!response.ok) {
        const shareError = await response.json().catch(() => null);
        const message =
          shareError?.error || "Unable to send invitation. Please try again.";
        throw new Error(message);
      }

      inviteForm.reset({
        email: "",
        permission: values.permission,
        expiresAt: "",
      });
      await fetchShares();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      inviteForm.setError("root", { type: "manual", message });
      console.error("Share failed:", error);
    }
  };

  const handleCreatePublicLink = async () => {
    if (!file) return;

    setLinkPending(true);
    try {
      const response = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          createPublicLink: true,
          permission: "view",
          expiresAt: null,
        }),
      });

      if (response.ok) {
        await response.json();
        await fetchShares();
      } else {
        const linkError = await response.json();
        console.error("Create public link failed:", linkError.error);
      }
    } catch (error) {
      console.error("Create public link failed:", error);
    } finally {
      setLinkPending(false);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    setDeletingId(shareId);
    try {
      const response = await fetch("/api/files/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });

      if (response.ok) {
        await fetchShares();
      }
    } catch (error) {
      console.error("Delete share failed:", error);
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (shareToken: string) => {
    if (!shareToken) return;
    const base =
      origin || (typeof window !== "undefined" ? window.location.origin : "");
    const shareUrl = base ? `${base}/shared/${shareToken}` : shareToken;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(shareToken);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const publicShares = useMemo(
    () => shares.filter((share) => share.share_token),
    [shares]
  );

  const userShares = useMemo(
    () => shares.filter((share) => !share.share_token),
    [shares]
  );

  const shareLinkLabel = (share: Share) => {
    if (!share.expires_at) return "No expiration";
    try {
      return `Expires ${format(new Date(share.expires_at), "MMM d, yyyy")}`;
    } catch {
      return "Expires soon";
    }
  };

  const shareUrlFor = (share: Share) =>
    share.share_token && origin ? `${origin}/shared/${share.share_token}` : "";

  const initialsFor = (share: Share) => {
    const name = share.profiles?.full_name?.trim();
    if (name) {
      const parts = name.split(" ");
      const initials = parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("");
      return initials.toUpperCase();
    }
    const emailAddress = share.profiles?.email;
    return emailAddress ? emailAddress[0]?.toUpperCase() ?? "U" : "U";
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share “{file.name}”</DialogTitle>
          <DialogDescription>
            Manage members and create public links for this file. Changes apply
            immediately.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="users">Members</TabsTrigger>
            <TabsTrigger value="link">Public link</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Mail aria-hidden="true" />
                  Invite collaborators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...inviteForm}>
                  <form
                    onSubmit={inviteForm.handleSubmit(handleInviteSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs uppercase tracking-wide">
                              Email address
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                autoComplete="email"
                                placeholder="teammate@company.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={inviteForm.control}
                        name="permission"
                        render={({ field }) => (
                          <FormItem className="sm:w-36">
                            <FormLabel className="text-xs uppercase tracking-wide">
                              Permission
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="view">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Eye aria-hidden="true" />
                                    View only
                                  </div>
                                </SelectItem>
                                <SelectItem value="edit">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Edit aria-hidden="true" />
                                    Can edit
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={inviteForm.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wide">
                            Expiration (optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {inviteForm.formState.errors.root?.message ? (
                      <div className="rounded-md bg-red-50/80 p-3 text-sm text-destructive dark:bg-red-900/20">
                        {inviteForm.formState.errors.root.message}
                      </div>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={inviteForm.formState.isSubmitting || !file}
                      className="w-full"
                    >
                      {inviteForm.formState.isSubmitting ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : null}
                      Send invitation
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">
                  People with access
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isFetching
                    ? "Refreshing access list..."
                    : userShares.length === 0
                    ? "No collaborators yet. Invite someone above."
                    : "Manage existing collaborators."}
                </p>
              </CardHeader>
              <Separator />

              <CardContent className="space-y-3 py-4">
                {userShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initialsFor(share)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {share.profiles?.full_name ||
                            share.profiles?.email ||
                            "Unknown user"}
                        </p>
                        {share.profiles?.email ? (
                          <p className="text-xs text-muted-foreground">
                            {share.profiles.email}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {share.permission}
                      </Badge>
                      {share.expires_at ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {shareLinkLabel(share)}
                        </div>
                      ) : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteShare(share.id)}
                        disabled={deletingId === share.id}
                      >
                        {deletingId === share.id ? (
                          <Loader2
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 aria-hidden="true" />
                        )}
                        <span className="sr-only">Remove access</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Link2 aria-hidden="true" />
                  Shareable link
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generate or manage a public link that anyone can open.
                </p>
              </CardHeader>

              <CardContent>
                {publicShares.length === 0 ? (
                  <>
                    <Button
                      onClick={handleCreatePublicLink}
                      disabled={linkPending}
                      className="w-full"
                    >
                      {linkPending ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : null}
                      Create shareable link
                    </Button>
                  </>
                ) : (
                  publicShares.map((share) => (
                    <div
                      key={share.id}
                      className="space-y-3 rounded-md border bg-muted/40 px-3 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Public</Badge>
                          <span className="text-sm font-medium">
                            Anyone with the link
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {share.expires_at ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {shareLinkLabel(share)}
                            </div>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteShare(share.id)}
                            disabled={deletingId === share.id}
                          >
                            {deletingId === share.id ? (
                              <Loader2
                                className="h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 aria-hidden="true" />
                            )}
                            <span className="sr-only">Delete public link</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={shareUrlFor(share)}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="sm:w-auto"
                          onClick={() =>
                            handleCopyLink(share.share_token ?? "")
                          }
                        >
                          {copiedLink === share.share_token ? (
                            <Check aria-hidden="true" />
                          ) : (
                            <Copy aria-hidden="true" />
                          )}
                          {copiedLink === share.share_token ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
