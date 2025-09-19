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

    const trimmedName = name.trim();

    type FileScopeRow = {
      id: string;
      name: string;
      folder_id: string | null;
      dataroom_id: string | null;
    };

    const { data: fileRecord, error: fetchError } = await supabase
      .from("files")
      .select("id, name, folder_id, dataroom_id")
      .eq("id", fileId)
      .eq("owner_id", user.id)
      .maybeSingle<FileScopeRow>();

    if (fetchError) {
      console.error("Rename file lookup error:", fetchError);
      return NextResponse.json(
        { error: "Failed to rename file" },
        { status: 500 }
      );
    }

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (fileRecord.name === trimmedName) {
      const { data: current, error: currentError } = await supabase
        .from("files")
        .select(
          "id,name,size,mime_type,blob_url,folder_id,dataroom_id,is_public,is_starred,created_at,updated_at,original_name"
        )
        .eq("id", fileId)
        .eq("owner_id", user.id)
        .single();

      if (currentError || !current) {
        console.error("Rename file fetch current error:", currentError);
        return NextResponse.json(
          { error: "Failed to rename file" },
          { status: 500 }
        );
      }

      return NextResponse.json(current);
    }

    // Load existing sibling names within the scope to enforce duplicate suffix policy.
    type NameRow = { name: string };
    let conflictQuery = supabase
      .from("files")
      .select("name")
      .eq("owner_id", user.id)
      .neq("id", fileId);

    conflictQuery = fileRecord.folder_id
      ? conflictQuery.eq("folder_id", fileRecord.folder_id)
      : conflictQuery.is("folder_id", null);

    conflictQuery = fileRecord.dataroom_id
      ? conflictQuery.eq("dataroom_id", fileRecord.dataroom_id)
      : conflictQuery.is("dataroom_id", null);

    const { data: siblingNames, error: conflictError } = await conflictQuery;

    if (conflictError) {
      console.error("Rename file conflict check error:", conflictError);
      return NextResponse.json(
        { error: "Failed to rename file" },
        { status: 500 }
      );
    }

    const existingNames = new Set(
      Array.isArray(siblingNames)
        ? (siblingNames as NameRow[]).map((row) => row.name)
        : []
    );

    const dotIndex = trimmedName.lastIndexOf(".");
    const base = dotIndex > 0 ? trimmedName.slice(0, dotIndex) : trimmedName;
    const ext = dotIndex > 0 ? trimmedName.slice(dotIndex) : "";

    let candidateName = trimmedName;
    if (existingNames.has(candidateName)) {
      let suffix = 1;
      while (existingNames.has(`${base} (${suffix})${ext}`)) {
        suffix += 1;
      }
      candidateName = `${base} (${suffix})${ext}`;
    }

    const { data: updated, error: dbError } = await supabase
      .from("files")
      .update({ name: candidateName })
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
