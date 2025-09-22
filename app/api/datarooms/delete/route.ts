import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

interface DeleteBody {
  dataroomId?: string;
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: DeleteBody;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const dataroomId =
      typeof payload.dataroomId === "string" && payload.dataroomId.trim()
        ? payload.dataroomId.trim()
        : "";

    if (!dataroomId) {
      return NextResponse.json(
        { error: "dataroomId is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("datarooms")
      .select("id")
      .eq("id", dataroomId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: string }>();

    if (fetchError) {
      console.error("Dataroom fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to delete dataroom" },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Dataroom not found" }, { status: 404 });
    }

    // Delete related folders and files first to avoid orphaned data where cascades are absent
    const { error: filesDeleteError } = await supabase
      .from("files")
      .delete()
      .eq("owner_id", user.id)
      .eq("dataroom_id", dataroomId);

    if (filesDeleteError) {
      console.error("Dataroom files delete error:", filesDeleteError);
      return NextResponse.json(
        { error: "Failed to delete dataroom files" },
        { status: 500 }
      );
    }

    const { error: foldersDeleteError } = await supabase
      .from("folders")
      .delete()
      .eq("owner_id", user.id)
      .eq("dataroom_id", dataroomId);

    if (foldersDeleteError) {
      console.error("Dataroom folders delete error:", foldersDeleteError);
      return NextResponse.json(
        { error: "Failed to delete dataroom folders" },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabase
      .from("datarooms")
      .delete()
      .eq("id", dataroomId)
      .eq("owner_id", user.id);

    if (deleteError) {
      console.error("Dataroom delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete dataroom" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dataroom delete route error:", error);
    return NextResponse.json(
      { error: "Failed to delete dataroom" },
      { status: 500 }
    );
  }
}
