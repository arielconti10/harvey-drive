import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

interface CreateBody {
  name?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: CreateBody;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Dataroom name is required" },
        { status: 400 }
      );
    }

    // Fetch existing dataroom names for the owner to enforce unique naming
    const { data: existingNamesData, error: fetchError } = await supabase
      .from("datarooms")
      .select("name")
      .eq("owner_id", user.id);

    if (fetchError) {
      console.error("Dataroom name fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to create dataroom" },
        { status: 500 }
      );
    }

    type ExistingNameRow = { name: string };
    const existingRows: ExistingNameRow[] = Array.isArray(existingNamesData)
      ? (existingNamesData as ExistingNameRow[])
      : [];
    const existingNames = existingRows.map((item) => item.name);

    let candidateName = name;
    if (existingNames.includes(candidateName)) {
      let suffix = 1;
      let nextName = `${candidateName} (${suffix})`;
      while (existingNames.includes(nextName)) {
        suffix += 1;
        nextName = `${candidateName} (${suffix})`;
      }
      candidateName = nextName;
    }

    const { data: created, error: insertError } = await supabase
      .from("datarooms")
      .insert({
        name: candidateName,
        owner_id: user.id,
      })
      .select("id, name, owner_id, created_at, updated_at")
      .single();

    if (insertError || !created) {
      console.error("Dataroom create error:", insertError);
      return NextResponse.json(
        { error: "Failed to create dataroom" },
        { status: 500 }
      );
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Dataroom create route error:", error);
    return NextResponse.json(
      { error: "Failed to create dataroom" },
      { status: 500 }
    );
  }
}
