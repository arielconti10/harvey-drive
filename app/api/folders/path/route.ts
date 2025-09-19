import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    if (!folderId) {
      return NextResponse.json(
        {
          path: [],
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const maxDepth = 20;
    const path: Array<{ id: string; name: string; parent_id: string | null }> = [];
    let currentId: string | null = folderId;
    let depth = 0;

    while (currentId && depth < maxDepth) {
      const { data, error } = (await supabase
        .from("folders")
        .select("id, name, parent_id")
        .eq("id", currentId)
        .eq("owner_id", user.id)
        .maybeSingle<{ id: string; name: string; parent_id: string | null }>()) as {
        data: { id: string; name: string; parent_id: string | null } | null;
        error: PostgrestError | null;
      };

      if (error) {
        console.error("Failed to fetch folder path", error);
        return NextResponse.json(
          { error: "Failed to fetch folder path" },
          { status: 500 }
        );
      }

      const folder = (data as { id: string; name: string; parent_id: string | null } | null) ?? null;
      if (!folder) break;

      path.push(folder);
      currentId = folder.parent_id;
      depth += 1;
    }

    if (depth >= maxDepth) {
      console.warn("Folder path exceeded max depth", { folderId });
    }

    return NextResponse.json({
      path: path.reverse(),
    });
  } catch (error) {
    console.error("Folders path error:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder path" },
      { status: 500 }
    );
  }
}
