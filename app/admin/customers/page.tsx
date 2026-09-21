import { createClient } from "@/lib/supabase/server";
import { CustomerManager } from "@/components/CustomerManager";

export default async function CustomersPage() {
  const { data, error } = await createClient().from("profiles").select("id, full_name, phone, role, created_at").eq("role", "customer").order("created_at", { ascending: false });
  return <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Administrator only</p><h1 className="mt-1 font-display text-3xl font-bold">Customer accounts</h1><p className="mb-6 mt-1 text-sm text-ash">All registered customer accounts appear here.</p>{error ? <p className="rounded-card bg-clay/10 p-4 text-sm text-clay">Could not load customer accounts: {error.message}</p> : <CustomerManager accounts={data ?? []} type="customers" />}</div>;
}
