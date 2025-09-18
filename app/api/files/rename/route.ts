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

    const { fileId, name } = await request.json();
    if (!fileId || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "fileId and name are required" },
        { status: 400 }
      );
    }

    const { data: updated, error: dbError } = await supabase
      .from("files")
      .update({ name: name.trim() })
      .eq("id", fileId)
      .eq("owner_id", user.id)
      .select(
        "id,name,size,mime_type,blob_url,folder_id,dataroom_id,is_public,is_starred,created_at,updated_at,original_name"
      )
      .single();

    if (dbError || !updated) {
      console.error("Rename file error:", dbError);
      return NextResponse.json(
        { error: "Failed to rename file" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Rename file route error:", error);
    return NextResponse.json(
      { error: "Failed to rename file" },
      { status: 500 }
    );
  }
}
