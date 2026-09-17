import { createClient } from "@/lib/supabase/server";
import { CourtManager } from "@/components/CourtManager";
export default async function CourtsPage() { const { data } = await createClient().from("courts").select("*").order("sort_order"); return <div><h1 className="mb-1 font-display text-2xl font-bold">Courts</h1><p className="mb-6 text-sm text-ash">Change hourly rates and temporarily close courts.</p><CourtManager courts={data ?? []} /></div>; }
