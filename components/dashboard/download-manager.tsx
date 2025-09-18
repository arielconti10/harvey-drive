"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { X, CheckCircle, AlertCircle } from "lucide-react"
import type { FileItem } from "@/lib/types"
import { formatFileSize } from "@/lib/utils/file-utils"
import { cn } from "@/lib/utils"

interface DownloadItem {
  id: string
  file: FileItem
  progress: number
  status: "pending" | "downloading" | "completed" | "error"
  error?: string
}

interface DownloadManagerProps {
  downloads: DownloadItem[]
  onRemoveDownload: (id: string) => void
  onClearCompleted: () => void
}

export function DownloadManager({ downloads, onRemoveDownload, onClearCompleted }: DownloadManagerProps) {
  if (downloads.length === 0) return null

  const completedDownloads = downloads.filter((d) => d.status === "completed")

  return (
    <div
      className={cn(
        "fixed inset-x-4 bottom-4 z-40 max-h-[70svh] rounded-xl border border-border bg-card text-card-foreground shadow-lg",
        "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-80"
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Downloads</h3>
          {completedDownloads.length > 0 && (
            <Button size="sm" variant="ghost" onClick={onClearCompleted}>
              Clear completed
            </Button>
          )}
        </div>
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3 sm:max-h-72">
        {downloads.map((download) => (
          <Card key={download.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {download.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {download.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {download.status === "downloading" && (
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{download.file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(download.file.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemoveDownload(download.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {download.status === "downloading" && <Progress value={download.progress} className="h-1" />}
              {download.status === "error" && <p className="text-xs text-red-600">{download.error}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
