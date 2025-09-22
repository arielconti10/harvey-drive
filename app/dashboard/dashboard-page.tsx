import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { QueryHydrate } from "@/components/query-hydrate";
import type { DashboardView } from "@/lib/types";

export async function renderDashboardPage(view: DashboardView = "files") {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const qc = new QueryClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile", profileError);
  }

  const { data: datarooms } = await supabase
    .from("datarooms")
    .select("id,name,created_at,updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  qc.setQueryData(["datarooms"], datarooms ?? []);
  const state = dehydrate(qc);

  return (
    <QueryHydrate state={state}>
      <DashboardShell user={user} profile={profile ?? null}>
        <DashboardClient view={view} />
      </DashboardShell>
    </QueryHydrate>
  );
}
