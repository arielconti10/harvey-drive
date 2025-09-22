import { createClient } from "@/lib/supabase/server"
import { SharedFileViewer } from "@/components/sharing/shared-file-viewer"
import { notFound } from "next/navigation"

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

interface SharedFilePageProps {
  params?: Promise<{
    token: string
  }>
}

export default async function SharedFilePage({ params }: SharedFilePageProps) {
  const supabase = await createClient()
  const resolvedParams = params ? await params : undefined
  const token = resolvedParams?.token

  if (!token) {
    notFound()
  }

  try {
    const { data, error } = await supabase.rpc("get_public_share", { token })

    if (error || !data || data.length === 0) {
      notFound()
    }

    const shareRecord = data[0] as PublicShareRow

    return (
      <SharedFileViewer
        file={{
          id: shareRecord.file_id,
          name: shareRecord.file_name,
          original_name: shareRecord.original_name,
          size: shareRecord.size,
          mime_type: shareRecord.mime_type,
          blob_url: shareRecord.blob_url,
          folder_id: shareRecord.folder_id,
          dataroom_id: shareRecord.dataroom_id ?? undefined,
          is_public: shareRecord.is_public,
          is_starred: false,
          created_at: shareRecord.file_created_at,
          updated_at: shareRecord.file_updated_at,
          profiles: {
            full_name: shareRecord.owner_full_name,
            email: shareRecord.owner_email,
          },
        }}
        permission={shareRecord.permission}
        expiresAt={shareRecord.expires_at}
      />
    )
  } catch (error) {
    console.error("Shared file page error:", error)
    notFound()
  }
}
