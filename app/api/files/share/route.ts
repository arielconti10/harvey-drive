import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"

interface ShareInsert {
  file_id: string
  shared_by_id: string
      permission: "view" | "edit" | "read" | "write"
  expires_at: string | null
  share_token?: string
  shared_with_id?: string | null
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

    const requestedPermission = permission === "edit" || permission === "write" ? "edit" : "view"
    const parsedExpires = expiresAt ? new Date(expiresAt) : null
    const expiresIso = parsedExpires && !Number.isNaN(parsedExpires.valueOf()) ? parsedExpires.toISOString() : null

    const basePayload: Omit<ShareInsert, "permission"> = {
      file_id: fileId,
      shared_by_id: user.id,
      expires_at: expiresIso,
    }

    if (createPublicLink) {
      // Create public share link
      basePayload.share_token = nanoid(32)
    } else if (sharedWithEmail) {
      // Share with specific user
      const { data: sharedUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", sharedWithEmail)
        .single()

      if (!sharedUser) {
        // Respond generically to avoid leaking which emails are registered.
        return NextResponse.json({ success: true })
      }

      basePayload.shared_with_id = sharedUser.id
    } else {
      return NextResponse.json({ error: "Either email or public link option is required" }, { status: 400 })
    }

    const permissionCandidates = requestedPermission === "edit" ? (["edit", "write"] as const) : (["view", "read"] as const)
    type ShareRow = {
      id: string
      share_token: string | null
      permission: ShareInsert["permission"]
      expires_at: string | null
    }

    let share: ShareRow | null = null
    let lastError: unknown = null

    for (const candidate of permissionCandidates) {
      const { data, error } = await supabase
        .from("file_shares")
        .insert({ ...basePayload, permission: candidate })
        .select("id, share_token, permission, expires_at")
        .single<ShareRow>()

      if (!error && data) {
        share = data
        break
      }

      lastError = error
    }

    if (!share) {
      console.error("Share creation error:", lastError)
      return NextResponse.json({ error: "Failed to create share" }, { status: 500 })
    }

    const normalizedPermission = share.permission === "write" ? "edit" : share.permission === "read" ? "view" : share.permission

    return NextResponse.json({
      id: share.id,
      shareToken: share.share_token,
      shareUrl: share.share_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shared/${share.share_token}`
        : null,
      permission: normalizedPermission,
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

    const normalizedShares = (shares || []).map((share) => ({
      ...share,
      permission:
        share.permission === "write"
          ? "edit"
          : share.permission === "read"
            ? "view"
            : share.permission,
    }))

    return NextResponse.json({ shares: normalizedShares })
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
