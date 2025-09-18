import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, parentId, dataroomId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();

    let conflictQuery = supabase
      .from("folders")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", normalizedName)
      .limit(1);

    conflictQuery = parentId
      ? conflictQuery.eq("parent_id", parentId)
      : conflictQuery.is("parent_id", null);

    conflictQuery = dataroomId
      ? conflictQuery.eq("dataroom_id", dataroomId)
      : conflictQuery.is("dataroom_id", null);

    const { data: existingFolder, error: conflictError } = await conflictQuery.maybeSingle();

    if (conflictError) {
      console.error("Folder conflict check failed:", conflictError);
      return NextResponse.json(
        { error: "Failed to create folder" },
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

    // Create folder in database
    const { data: folder, error: dbError } = await supabase
      .from("folders")
      .insert({
        name: normalizedName,
        parent_id: parentId || null,
        owner_id: user.id,
        dataroom_id: dataroomId || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to create folder" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      created_at: folder.created_at,
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
