"use client"

import { useState, useCallback } from "react"
import type { FileItem } from "@/lib/types"

interface DownloadItem {
  id: string
  file: FileItem
  progress: number
  status: "pending" | "downloading" | "completed" | "error"
  error?: string
}

export function useDownloadManager() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])

  const downloadFile = useCallback(async (file: FileItem) => {
    const downloadId = Math.random().toString(36).substr(2, 9)
    const downloadItem: DownloadItem = {
      id: downloadId,
      file,
      progress: 0,
      status: "pending",
    }

    setDownloads((prev) => [...prev, downloadItem])

    let progressInterval: ReturnType<typeof setInterval> | null = null
    const controller = new AbortController()

    try {
      setDownloads((prev) => prev.map((d) => (d.id === downloadId ? { ...d, status: "downloading" } : d)))

      // Baseline simulated progress in case the server omits Content-Length
      progressInterval = setInterval(() => {
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === downloadId && d.progress < 90 ? { ...d, progress: d.progress + Math.random() * 20 } : d,
          ),
        )
      }, 200)

      // Create download link and trigger download
      const response = await fetch(file.blob_url, { signal: controller.signal, cache: "no-store" })
      if (!response.ok) throw new Error("Download failed")

      let blob: Blob

      if (response.body && response.headers.get("content-length")) {
        const total = Number(response.headers.get("content-length"))
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let received = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.byteLength
            const percent = Math.max(1, Math.min(99, Math.round((received / total) * 100)))
            setDownloads((prev) =>
              prev.map((d) => (d.id === downloadId ? { ...d, progress: percent } : d)),
            )
          }
        }

        blob = new Blob(chunks)
      } else {
        blob = await response.blob()
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      a.rel = "noreferrer"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      setDownloads((prev) => prev.map((d) => (d.id === downloadId ? { ...d, progress: 100, status: "completed" } : d)))
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId
            ? {
                ...d,
                status: "error",
                error: error instanceof Error ? error.message : "Download failed",
              }
            : d,
        ),
      )
    } finally {
      controller.abort()
    }
  }, [])

  const downloadMultipleFiles = useCallback(
    async (files: FileItem[]) => {
      for (const file of files) {
        await downloadFile(file)
        // Add small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    },
    [downloadFile],
  )

  const removeDownload = useCallback((id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => prev.filter((d) => d.status !== "completed"))
  }, [])

  return {
    downloads,
    downloadFile,
    downloadMultipleFiles,
    removeDownload,
    clearCompleted,
  }
}
