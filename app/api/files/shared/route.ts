import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    type FileRow = {
      id: string;
      name: string;
      original_name: string;
      size: number;
      mime_type: string;
      blob_url: string;
      folder_id: string | null;
      dataroom_id: string | null;
      is_public: boolean;
      is_starred: boolean;
      created_at: string;
      updated_at: string;
    };

    type SharedRow = {
      id: string;
      permission: "view" | "edit" | "read" | "write";
      shared_by_id: string;
      shared_with_id: string | null;
      expires_at: string | null;
      files: FileRow | FileRow[] | null;
    };

    const { data, error } = await supabase
      .from("file_shares")
      .select(
        `id, permission, shared_by_id, shared_with_id, expires_at, files (id, name, original_name, size, mime_type, blob_url, folder_id, dataroom_id, is_public, is_starred, created_at, updated_at)`
      )
      .or(`shared_by_id.eq.${user.id},shared_with_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Shared files fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load shared files" },
        { status: 500 }
      );
    }

    const items = (data as SharedRow[] | null) ?? [];
    const seen = new Map<string, { row: SharedRow; file: FileRow }>();

    const extractFiles = (files: SharedRow["files"]): FileRow[] => {
      if (!files) return [];
      return Array.isArray(files)
        ? files.filter((file): file is FileRow => Boolean(file))
        : [files];
    };

    for (const row of items) {
      const files = extractFiles(row.files);
      if (files.length === 0) continue;
      for (const file of files) {
        if (!seen.has(file.id)) {
          seen.set(file.id, { row, file });
        }
      }
    }

    const sharedFiles = Array.from(seen.values())
      .map(({ row, file }) => {
        const normalizedPermission =
          row.permission === "write"
            ? "edit"
            : row.permission === "read"
            ? "view"
            : row.permission;
        return {
          ...file,
          dataroom_id: file.dataroom_id ?? undefined,
          shared_permission: normalizedPermission,
          shared_via: row.shared_by_id === user.id ? "sent" : "received",
          shared_expires_at: row.expires_at,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    return NextResponse.json({ files: sharedFiles });
  } catch (error) {
    console.error("Shared files route error:", error);
    return NextResponse.json(
      { error: "Failed to load shared files" },
      { status: 500 }
    );
  }
}
