"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Link, Mail, Trash2, Eye, Edit, Clock, Check } from "lucide-react"
import type { FileItem } from "@/lib/types"
import { format } from "date-fns"

interface ShareDialogProps {
  files: FileItem[]
  isOpen: boolean
  onClose: () => void
}

interface Share {
  id: string
  permission: "view" | "edit"
  share_token: string | null
  expires_at: string | null
  created_at: string
  shared_with_id: string | null
  profiles?: {
    email: string
    full_name: string
  }
}

export function ShareDialog({ files, isOpen, onClose }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<"view" | "edit">("view")
  const [expiresAt, setExpiresAt] = useState("")
  const [publicLinkExpires, setPublicLinkExpires] = useState("")
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const file = files[activeIndex] ?? null
  const multipleFiles = files.length > 1

  const fetchShares = useCallback(async () => {
    if (!file) return

    try {
      const response = await fetch(`/api/files/share?fileId=${file.id}`)
      if (response.ok) {
        const data = await response.json()
        setShares(data.shares || [])
      }
    } catch (error) {
      console.error("Failed to fetch shares:", error)
    }
  }, [file])

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0)
      setShares([])
      return
    }

    if (files.length === 0) {
      onClose()
      return
    }

    if (activeIndex >= files.length) {
      setActiveIndex(0)
    }
  }, [files, activeIndex, isOpen, onClose])

  useEffect(() => {
    if (file && isOpen) {
      void fetchShares()
    }
  }, [file, fetchShares, isOpen])

  const handleShareWithUser = async () => {
    if (!file || !email.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          sharedWithEmail: email.trim(),
          permission,
          expiresAt: expiresAt || null,
        }),
      })

      if (response.ok) {
        setEmail("")
        setExpiresAt("")
        void fetchShares()
      } else {
        const shareError = await response.json()
        console.error("Share failed:", shareError.error)
      }
    } catch (error) {
      console.error("Share failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePublicLink = async () => {
    if (!file) return

    setLoading(true)
    try {
      const response = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          createPublicLink: true,
          permission: "view",
          expiresAt: publicLinkExpires || null,
        }),
      })

      if (response.ok) {
        await response.json()
        void fetchShares()
      } else {
        const linkError = await response.json()
        console.error("Create public link failed:", linkError.error)
      }
    } catch (error) {
      console.error("Create public link failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteShare = async (shareId: string) => {
    try {
      const response = await fetch("/api/files/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      })

      if (response.ok) {
        void fetchShares()
      }
    } catch (error) {
      console.error("Delete share failed:", error)
    }
  }

  const handleCopyLink = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(shareToken)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  if (!file) return null

  const publicShares = shares.filter((share) => share.share_token)
  const userShares = shares.filter((share) => !share.share_token)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Share &ldquo;{file.name}&rdquo;</span>
            {multipleFiles && (
              <Select
                value={String(activeIndex)}
                onValueChange={(value) => {
                  setActiveIndex(Number(value))
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select file" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((f, index) => (
                    <SelectItem key={f.id} value={String(index)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Share with users</TabsTrigger>
            <TabsTrigger value="link">Share with link</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Share with specific users */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Invite people
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="sm:w-32">
                    <Label htmlFor="permission">Permission</Label>
                    <Select value={permission} onValueChange={(value: "view" | "edit") => setPermission(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </div>
                        </SelectItem>
                        <SelectItem value="edit">
                          <div className="flex items-center">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="expires">Expires (optional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
                <Button onClick={handleShareWithUser} disabled={loading || !email.trim()} className="w-full">
                  Send invitation
                </Button>
              </CardContent>
            </Card>

            {/* Existing user shares */}
            {userShares.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">People with access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userShares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {share.profiles?.full_name?.charAt(0) || share.profiles?.email?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{share.profiles?.full_name || "Unknown User"}</p>
                            <p className="text-sm text-gray-500">{share.profiles?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            {share.permission === "view" ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                            <span className="capitalize">{share.permission}</span>
                          </div>
                          {share.expires_at && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(share.expires_at), "MMM d")}</span>
                            </div>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteShare(share.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            {/* Public link sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Link className="h-5 w-5 mr-2" />
                  Share with link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {publicShares.length === 0 ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create a shareable link that anyone can use to access this file.
                    </p>
                    <div>
                      <Label htmlFor="publicExpires">Link expires (optional)</Label>
                      <Input
                        id="publicExpires"
                        type="datetime-local"
                        value={publicLinkExpires}
                        onChange={(e) => setPublicLinkExpires(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreatePublicLink} disabled={loading} className="w-full">
                      Create shareable link
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    {publicShares.map((share) => (
                      <div key={share.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Link className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Public link</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {share.expires_at && (
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>Expires {format(new Date(share.expires_at), "MMM d, yyyy")}</span>
                              </div>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteShare(share.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={`${window.location.origin}/shared/${share.share_token}`}
                            readOnly
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => share.share_token && handleCopyLink(share.share_token)}
                          >
                            {copiedLink === share.share_token ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
