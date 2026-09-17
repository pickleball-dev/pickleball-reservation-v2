import { createClient } from "@/lib/supabase/server";
import { CustomerManager } from "@/components/CustomerManager";
export default async function CustomersPage() { const { data } = await createClient().from("profiles").select("id, full_name, phone, role, created_at").order("created_at", { ascending: false }); return <div><h1 className="mb-1 font-display text-2xl font-bold">Customers & staff</h1><p className="mb-6 text-sm text-ash">Manage customer, staff, and administrator access.</p><CustomerManager customers={data ?? []} /></div>; }
