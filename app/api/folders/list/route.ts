import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataroomId = searchParams.get("dataroomId");
    const parentIdParam = searchParams.get("parentId");
    const parentId = parentIdParam === "null" ? null : parentIdParam;

    if (!dataroomId) {
      return NextResponse.json({ folders: [] });
    }

    const { data: dataroom, error: dataroomError } = await supabase
      .from("datarooms")
      .select("id")
      .eq("id", dataroomId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (dataroomError) {
      console.error("Failed to verify dataroom", dataroomError);
      return NextResponse.json(
        { error: "Failed to fetch folders" },
        { status: 500 }
      );
    }

    if (!dataroom) {
      return NextResponse.json({ folders: [] });
    }

    let query = supabase
      .from("folders")
      .select(
        `
        id,
        name,
        parent_id,
        dataroom_id,
        created_at,
        updated_at
      `
      )
      .eq("owner_id", user.id)
      .eq("dataroom_id", dataroomId);

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data: folders, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Failed to fetch folders", error);
      return NextResponse.json(
        { error: "Failed to fetch folders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ folders: folders ?? [] });
  } catch (error) {
    console.error("Folders list error", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}
