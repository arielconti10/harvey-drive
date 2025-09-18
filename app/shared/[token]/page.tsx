import { createClient } from "@/lib/supabase/server"
import { SharedFileViewer } from "@/components/sharing/shared-file-viewer"
import type { FileItem } from "@/lib/types"
import { notFound } from "next/navigation"

interface SharedFilePageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SharedFilePage(props: SharedFilePageProps) {
  const params = await props.params;
  const supabase = await createClient()
  const { token } = params

  type SharedFile = FileItem & {
    profiles: {
      full_name: string | null
      email: string | null
    }
  }

  type ShareRecord = {
    id: string
    permission: "view" | "edit"
    expires_at: string | null
    files: SharedFile
  }

  try {
    // Get share information
    const { data: share, error } = await supabase
      .from("file_shares")
      .select(`
        id,
        permission,
        expires_at,
        files!inner(
          id,
          name,
          original_name,
          size,
          mime_type,
          blob_url,
          created_at,
          profiles!files_owner_id_fkey(full_name, email)
        )
      `)
      .eq("share_token", token)
      .single()

    if (error || !share) {
      notFound()
    }

    // Check if share has expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      notFound()
    }

    const shareRecord = share as ShareRecord

    return (
      <SharedFileViewer
        file={shareRecord.files}
        permission={shareRecord.permission}
        expiresAt={shareRecord.expires_at}
      />
    )
  } catch (error) {
    console.error("Shared file page error:", error)
    notFound()
  }
}
