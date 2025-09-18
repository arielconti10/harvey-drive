import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { QueryHydrate } from "@/components/query-hydrate";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // React Query prefetch: datarooms list
  const qc = new QueryClient();
  // SSR prefetch directly from Supabase to avoid cookie/URL issues
  const { data: datarooms } = await supabase
    .from("datarooms")
    .select("id,name,created_at,updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  qc.setQueryData(["datarooms"], datarooms ?? []);
  const state = dehydrate(qc);

  return (
    <QueryHydrate state={state}>
      <DashboardClient />
    </QueryHydrate>
  );
}
