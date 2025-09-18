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

    const { dataroomId, name } = await request.json();

    if (!dataroomId || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "dataroomId and name are required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const { data: updated, error } = await supabase
      .from("datarooms")
      .update({ name: trimmedName })
      .eq("id", dataroomId)
      .eq("owner_id", user.id)
      .select("id, name, created_at, updated_at")
      .single();

    if (error || !updated) {
      console.error("Rename dataroom error:", error);
      return NextResponse.json(
        { error: "Failed to rename dataroom" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Dataroom rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename dataroom" },
      { status: 500 }
    );
  }
}
