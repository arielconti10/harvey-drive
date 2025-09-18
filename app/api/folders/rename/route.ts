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

    const { folderId, name } = await request.json();
    if (!folderId || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "folderId and name are required" },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();

    const { data: folderRecord, error: fetchError } = await supabase
      .from("folders")
      .select("id, parent_id, dataroom_id, owner_id, name")
      .eq("id", folderId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch folder for rename failed:", fetchError);
      return NextResponse.json(
        { error: "Failed to rename folder" },
        { status: 500 }
      );
    }

    if (!folderRecord) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    let conflictQuery = supabase
      .from("folders")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", normalizedName)
      .neq("id", folderId)
      .limit(1);

    conflictQuery = folderRecord.parent_id
      ? conflictQuery.eq("parent_id", folderRecord.parent_id)
      : conflictQuery.is("parent_id", null);

    conflictQuery = folderRecord.dataroom_id
      ? conflictQuery.eq("dataroom_id", folderRecord.dataroom_id)
      : conflictQuery.is("dataroom_id", null);

    const { data: existingFolder, error: conflictError } = await conflictQuery.maybeSingle();

    if (conflictError) {
      console.error("Folder rename conflict check failed:", conflictError);
      return NextResponse.json(
        { error: "Failed to rename folder" },
        { status: 500 }
      );
    }

    if (existingFolder) {
      return NextResponse.json(
        {
          error: `The name “${normalizedName}” is already taken. Please choose a different name.`,
        },
        { status: 409 }
      );
    }

    const { data: updated, error: dbError } = await supabase
      .from("folders")
      .update({ name: normalizedName })
      .eq("id", folderId)
      .eq("owner_id", user.id)
      .select("id,name,parent_id,created_at,updated_at")
      .single();

    if (dbError || !updated) {
      console.error("Rename folder error:", dbError);
      return NextResponse.json(
        { error: "Failed to rename folder" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Rename folder route error:", error);
    return NextResponse.json(
      { error: "Failed to rename folder" },
      { status: 500 }
    );
  }
}
