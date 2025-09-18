import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

type PublicShareRow = {
  share_id: string
  permission: "view" | "edit"
  expires_at: string | null
  file_id: string
  file_name: string
  original_name: string
  size: number
  mime_type: string
  blob_url: string
  file_created_at: string
  file_updated_at: string
  folder_id: string | null
  dataroom_id: string | null
  is_public: boolean
  owner_full_name: string | null
  owner_email: string | null
}

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const supabase = await createClient()
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: "Share token is required" }, { status: 400 })
    }

    // Fetch share and file metadata via security-definer RPC so auth is optional
    const { data, error: shareError } = await supabase.rpc("get_public_share", { token })

    if (shareError || !data || data.length === 0) {
      return NextResponse.json({ error: "Share not found or expired" }, { status: 404 })
    }

    const share = data[0] as PublicShareRow

    return NextResponse.json({
      file: {
        id: share.file_id,
        name: share.file_name,
        original_name: share.original_name,
        size: share.size,
        mime_type: share.mime_type,
        blob_url: share.blob_url,
        folder_id: share.folder_id,
        dataroom_id: share.dataroom_id,
        is_public: share.is_public,
        created_at: share.file_created_at,
        updated_at: share.file_updated_at,
        profiles: {
          full_name: share.owner_full_name,
          email: share.owner_email,
        },
      },
      permission: share.permission,
      expiresAt: share.expires_at,
    })
  } catch (error) {
    console.error("Get shared file error:", error)
    return NextResponse.json({ error: "Failed to get shared file" }, { status: 500 })
  }
}
