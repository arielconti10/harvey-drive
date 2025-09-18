import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import path from "node:path";
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
    const folderId = formData.get("folderId") as string | null;
    const dataroomId = formData.get("dataroomId") as string | null;

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

    // Avoid duplicate names within the same folder by auto-suffixing
    const originalName = file.name;
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const ext = dotIndex > 0 ? originalName.slice(dotIndex) : "";

    let existingNames: string[] = [];
    {
      type NameRow = { name: string }
      let nameQuery = supabase
        .from("files")
        .select("name")
        .eq("owner_id", user.id);
      if (folderId) {
        nameQuery = nameQuery.eq("folder_id", folderId);
      } else {
        nameQuery = nameQuery.is("folder_id", null);
      }
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

    const isProduction = process.env.NODE_ENV === "production";
    let blobUrl: string;

    if (isProduction) {
      // Upload to Vercel Blob with user-specific path (use original filename for storage key)
      const filename = `${user.id}/${Date.now()}-${originalName}`;
      const blob = await put(filename, file, { access: "public" });
      blobUrl = blob.url;
    } else {
      // Persist locally during development to avoid remote uploads
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const sanitizedOriginalName = path
        .basename(originalName)
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const safeName = `${user.id}-${Date.now()}-${sanitizedOriginalName}`;
      const filePath = path.join(uploadDir, safeName);
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));

      blobUrl = `/uploads/${safeName}`;
    }

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
      is_public: fileData.is_public,
      created_at: fileData.created_at,
      updated_at: fileData.updated_at,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
