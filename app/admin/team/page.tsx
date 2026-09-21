import { createClient } from "@/lib/supabase/server";
import { CustomerManager } from "@/components/CustomerManager";

export default async function TeamPage() {
  const { data, error } = await createClient().from("profiles").select("id, full_name, phone, role, created_at").in("role", ["staff", "admin"]).order("created_at", { ascending: false });
  return <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Administrator only</p><h1 className="mt-1 font-display text-3xl font-bold">Staff / admin accounts</h1><p className="mb-6 mt-1 text-sm text-ash">Only administrators can review or change elevated accounts.</p>{error ? <p className="rounded-card bg-clay/10 p-4 text-sm text-clay">Could not load staff and administrator accounts: {error.message}</p> : <CustomerManager accounts={data ?? []} type="team" />}</div>;
}
