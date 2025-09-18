import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const dataroomId = searchParams.get("dataroomId");
    const search = searchParams.get("search");
    const view = searchParams.get("view");
    const isStarredView = view === "starred";

    let query = supabase
      .from("files")
      .select(
        `
        id,
        name,
        size,
        mime_type,
        blob_url,
        folder_id,
        is_public,
        is_starred,
        created_at,
        updated_at
      `
      )
      .eq("owner_id", user.id);

    // Filter by dataroom
    if (dataroomId) {
      query = query.eq("dataroom_id", dataroomId);
    }

    if (isStarredView) {
      query = query.eq("is_starred", true);
    }

    if (search) {
      if (isStarredView) {
        query = query.ilike("name", `%${search}%`);
      } else {
        let foldersQuery = supabase
          .from("folders")
          .select("id, parent_id, dataroom_id")
          .eq("owner_id", user.id);

        if (dataroomId) {
          foldersQuery = foldersQuery.eq("dataroom_id", dataroomId);
        }

        const { data: folderRows, error: folderError } = await foldersQuery;

        if (folderError) {
          console.error("Failed to fetch folders for search", folderError);
          return NextResponse.json(
            { error: "Failed to fetch files" },
            { status: 500 }
          );
        }

        const rows = folderRows ?? [];
        const childrenByParent = new Map<string | null, string[]>();

        for (const folder of rows) {
          const parentKey = (folder.parent_id as string | null) ?? null;
          if (!childrenByParent.has(parentKey)) {
            childrenByParent.set(parentKey, []);
          }
          childrenByParent.get(parentKey)!.push(folder.id as string);
        }

        if (folderId) {
          const queue: string[] = [folderId];
          const descendantIds = new Set<string>();

          while (queue.length > 0) {
            const current = queue.shift()!;
            if (descendantIds.has(current)) continue;
            descendantIds.add(current);
            const children = childrenByParent.get(current) || [];
            queue.push(...children);
          }

          if (descendantIds.size > 0) {
            query = query.in("folder_id", Array.from(descendantIds));
          } else {
            query = query.eq("folder_id", folderId);
          }
        } else {
          const descendantIds = Array.from(
            new Set(rows.map((folder) => folder.id as string))
          );
          if (descendantIds.length > 0) {
            const formattedIds = descendantIds
              .map((id) => `"${id}"`)
              .join(",");
            query = query.or(`folder_id.is.null,folder_id.in.(${formattedIds})`);
          } else {
            query = query.is("folder_id", null);
          }
        }

        query = query.ilike("name", `%${search}%`);
      }
    } else if (!isStarredView) {
      if (folderId) {
        query = query.eq("folder_id", folderId);
      } else {
        query = query.is("folder_id", null);
      }
    }

    const { data: files, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 }
      );
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
