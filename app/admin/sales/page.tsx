import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/pricing";

export default async function SalesPage() {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const { data } = await createClient().from("reservations").select("total_amount, starts_at").eq("status", "confirmed").gte("starts_at", yearStart.toISOString()).lte("starts_at", now.toISOString());
  const totalFrom = (start: Date) => (data ?? []).filter((r) => new Date(r.starts_at) >= start).reduce((sum, r) => sum + Number(r.total_amount), 0);
  const cards = [["Daily sales", totalFrom(dayStart)], ["Monthly sales", totalFrom(monthStart)], ["Yearly sales", totalFrom(yearStart)]];
  return <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Administrator only</p><h1 className="mt-1 font-display text-3xl font-bold">Confirmed sales</h1><p className="mb-6 mt-1 text-sm text-ash">Totals include paid, confirmed reservations only.</p><section className="grid gap-3 sm:grid-cols-3">{cards.map(([label, amount]) => <article key={String(label)} className="rounded-card border border-line bg-surface p-5 shadow-card"><p className="text-xs font-semibold uppercase tracking-wide text-ash">{label}</p><p className="mt-2 font-display text-3xl font-bold text-court">{formatPeso(Number(amount))}</p></article>)}</section></div>;
}
