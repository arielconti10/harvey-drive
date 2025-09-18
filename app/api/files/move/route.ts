import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, targetFolderId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId is required" },
        { status: 400 }
      );
    }

    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .select("id, folder_id, dataroom_id")
      .eq("id", fileId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (fileError) {
      console.error("Move file lookup error:", fileError);
      return NextResponse.json(
        { error: "Failed to move file" },
        { status: 500 }
      );
    }

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    let targetDataroomId = fileRecord.dataroom_id ?? null;

    if (targetFolderId) {
      const { data: folderRecord, error: folderError } = await supabase
        .from("folders")
        .select("id, dataroom_id")
        .eq("id", targetFolderId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (folderError) {
        console.error("Move file target lookup error:", folderError);
        return NextResponse.json(
          { error: "Failed to move file" },
          { status: 500 }
        );
      }

      if (!folderRecord) {
        return NextResponse.json(
          { error: "Target folder not found" },
          { status: 404 }
        );
      }

      targetDataroomId = folderRecord.dataroom_id ?? targetDataroomId;
    }

    const { data: updated, error: updateError } = await supabase
      .from("files")
      .update({
        folder_id: targetFolderId ?? null,
        dataroom_id: targetDataroomId,
      })
      .eq("id", fileId)
      .eq("owner_id", user.id)
      .select(
        "id,name,size,mime_type,folder_id,dataroom_id,blob_url,is_public,is_starred,created_at,updated_at"
      )
      .single();

    if (updateError || !updated) {
      console.error("Move file update error:", updateError);
      return NextResponse.json(
        { error: "Failed to move file" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Files move route error:", error);
    return NextResponse.json({ error: "Failed to move file" }, { status: 500 });
  }
}
