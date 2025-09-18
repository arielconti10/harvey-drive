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

    const { data, error } = await supabase
      .from("datarooms")
      .select("id,name,created_at,updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dataroom list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch datarooms" },
        { status: 500 }
      );
    }

    return NextResponse.json({ datarooms: data });
  } catch (e) {
    console.error("Dataroom list route error:", e);
    return NextResponse.json(
      { error: "Failed to fetch datarooms" },
      { status: 500 }
    );
  }
}
