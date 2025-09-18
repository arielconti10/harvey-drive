import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
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
  const { data: datarooms } = await supabase
    .from("datarooms")
    .select("id,name,created_at,updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  qc.setQueryData(["datarooms"], datarooms ?? []);
  const state = dehydrate(qc);

  return (
    <QueryHydrate state={state}>
      <DashboardClient view={view} />
    </QueryHydrate>
  );
}
