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

    const { fileId, starred } = (await request.json()) as {
      fileId?: string;
      starred?: boolean;
    };

    if (!fileId || typeof starred !== "boolean") {
      return NextResponse.json(
        { error: "fileId and starred flag are required" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("files")
      .update({ is_starred: starred })
      .eq("id", fileId)
      .eq("owner_id", user.id)
      .select(
        `
        id,
        name,
        original_name,
        size,
        mime_type,
        blob_url,
        folder_id,
        dataroom_id,
        is_public,
        is_starred,
        created_at,
        updated_at
      `
      )
      .maybeSingle();

    if (error || !updated) {
      const message = error?.message ?? "Failed to update star";
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ file: updated });
  } catch (err) {
    console.error("Toggle star error:", err);
    return NextResponse.json(
      { error: "Failed to update star" },
      { status: 500 }
    );
  }
}
