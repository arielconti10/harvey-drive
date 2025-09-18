import { del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import path from "node:path"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "No file ID provided" }, { status: 400 })
    }

    // Get file info first
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("blob_url, owner_id")
      .eq("id", fileId)
      .single()

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check ownership
    if (file.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (file.blob_url.startsWith("/")) {
      // Clean up local uploads stored during development
      const relativePath = file.blob_url.replace(/^\//, "")
      const localPath = path.join(process.cwd(), "public", relativePath)
      try {
        await fs.unlink(localPath)
      } catch (err: unknown) {
        if (typeof err === "object" && err && "code" in err) {
          const { code } = err as { code?: string }
          if (code !== "ENOENT") {
            throw err
          }
        } else {
          throw err
        }
      }
    } else {
      // Delete hosted blobs (current and legacy Vercel Blob URLs)
      await del(file.blob_url)
    }

    // Delete from database
    const { error: deleteError } = await supabase.from("files").delete().eq("id", fileId)

    if (deleteError) {
      console.error("Database delete error:", deleteError)
      return NextResponse.json({ error: "Failed to delete file record" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
