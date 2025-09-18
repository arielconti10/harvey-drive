import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"

interface ShareInsert {
  file_id: string
  shared_by_id: string
  permission: string
  expires_at: string | null
  share_token?: string
  shared_with_id?: string
}

export async function POST(request: NextRequest) {
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

    const { fileId, sharedWithEmail, permission, expiresAt, createPublicLink } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Verify file ownership
    const { data: file, error: fileError } = await supabase.from("files").select("owner_id").eq("id", fileId).single()

    if (fileError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (file.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const shareData: ShareInsert = {
      file_id: fileId,
      shared_by_id: user.id,
      permission: permission || "view",
      expires_at: null,
    }

    if (createPublicLink) {
      // Create public share link
      shareData.share_token = nanoid(32)
      shareData.expires_at = expiresAt || null
    } else if (sharedWithEmail) {
      // Share with specific user
      const { data: sharedUser } = await supabase.from("profiles").select("id").eq("email", sharedWithEmail).single()

      if (!sharedUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      shareData.shared_with_id = sharedUser.id
      shareData.expires_at = expiresAt || null
    } else {
      return NextResponse.json({ error: "Either email or public link option is required" }, { status: 400 })
    }

    const { data: share, error: shareError } = await supabase.from("file_shares").insert(shareData).select().single()

    if (shareError) {
      console.error("Share creation error:", shareError)
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 })
    }

    return NextResponse.json({
      id: share.id,
      shareToken: share.share_token,
      shareUrl: share.share_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shared/${share.share_token}`
        : null,
      permission: share.permission,
      expiresAt: share.expires_at,
    })
  } catch (error) {
    console.error("Share error:", error)
    return NextResponse.json({ error: "Failed to share file" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Get all shares for this file
    const { data: shares, error } = await supabase
      .from("file_shares")
      .select(`
        id,
        permission,
        share_token,
        expires_at,
        created_at,
        shared_with_id,
        profiles!file_shares_shared_with_id_fkey(email, full_name)
      `)
      .eq("file_id", fileId)
      .eq("shared_by_id", user.id)

    if (error) {
      console.error("Get shares error:", error)
      return NextResponse.json({ error: "Failed to get shares" }, { status: 500 })
    }

    return NextResponse.json({ shares })
  } catch (error) {
    console.error("Get shares error:", error)
    return NextResponse.json({ error: "Failed to get shares" }, { status: 500 })
  }
}

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

    const { shareId } = await request.json()

    if (!shareId) {
      return NextResponse.json({ error: "Share ID is required" }, { status: 400 })
    }

    // Delete share (RLS will ensure user can only delete their own shares)
    const { error } = await supabase.from("file_shares").delete().eq("id", shareId).eq("shared_by_id", user.id)

    if (error) {
      console.error("Delete share error:", error)
      return NextResponse.json({ error: "Failed to delete share" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete share error:", error)
    return NextResponse.json({ error: "Failed to delete share" }, { status: 500 })
  }
}
