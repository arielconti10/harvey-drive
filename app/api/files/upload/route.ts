import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import {
  MAX_FILE_SIZE_BYTES,
  isAllowedFileType,
} from "@/lib/constants/files";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = (formData.get("folderId") as string | null) || null;
    const dataroomId = (formData.get("dataroomId") as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 50 MB." },
        { status: 400 }
      );
    }

    if (!isAllowedFileType(file.type, file.name)) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 }
      );
    }

    // Validate container ownership before writing metadata
    if (dataroomId) {
      type DataroomRow = { id: string; owner_id: string };
      const { data: room } = await supabase
        .from("datarooms")
        .select("id, owner_id")
        .eq("id", dataroomId)
        .eq("owner_id", user.id)
        .maybeSingle<DataroomRow>();
      if (!room) {
        return NextResponse.json({ error: "Dataroom not found" }, { status: 404 });
      }
    }

    if (folderId) {
      type FolderRow = { id: string; owner_id: string; dataroom_id: string | null };
      const { data: folder } = await supabase
        .from("folders")
        .select("id, owner_id, dataroom_id")
        .eq("id", folderId)
        .eq("owner_id", user.id)
        .maybeSingle<FolderRow>();
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      if (dataroomId && folder.dataroom_id !== dataroomId) {
        return NextResponse.json({ error: "Folder not in the specified dataroom" }, { status: 400 });
      }
    }

    // Avoid duplicate names within the same folder/dataroom by auto-suffixing
    const originalName = file.name;
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const ext = dotIndex > 0 ? originalName.slice(dotIndex) : "";

    let existingNames: string[] = [];
    {
      type NameRow = { name: string };
      let nameQuery = supabase
        .from("files")
        .select("name")
        .eq("owner_id", user.id);
      nameQuery = folderId ? nameQuery.eq("folder_id", folderId) : nameQuery.is("folder_id", null);
      nameQuery = dataroomId ? nameQuery.eq("dataroom_id", dataroomId) : nameQuery.is("dataroom_id", null);
      const { data: existing } = await nameQuery;
      const existingRecords: NameRow[] = Array.isArray(existing)
        ? (existing as NameRow[])
        : [];
      existingNames = existingRecords.map((record) => record.name);
    }

    let candidateName = originalName;
    if (existingNames.includes(candidateName)) {
      let n = 1;
      while (existingNames.includes(`${base} (${n})${ext}`)) n++;
      candidateName = `${base} (${n})${ext}`;
    }

    const filename = `${user.id}/${Date.now()}-${originalName}`;
    const blob = await put(filename, file, { access: "public" });
    const blobUrl = blob.url;

    // Save file metadata to database
    const { data: fileData, error: dbError } = await supabase
      .from("files")
      .insert({
        name: candidateName,
        original_name: originalName,
        size: file.size,
        mime_type: file.type,
        blob_url: blobUrl,
        folder_id: folderId || null,
        dataroom_id: dataroomId || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save file metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: fileData.id,
      name: fileData.name,
      original_name: fileData.original_name,
      size: fileData.size,
      mime_type: fileData.mime_type,
      blob_url: fileData.blob_url,
      folder_id: fileData.folder_id,
      dataroom_id: fileData.dataroom_id,
      is_public: fileData.is_public,
      is_starred: fileData.is_starred,
      created_at: fileData.created_at,
      updated_at: fileData.updated_at,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
