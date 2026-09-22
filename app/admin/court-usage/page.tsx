import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/availability";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function CourtUsagePage() {
  const supabase = createClient(); const now = new Date().toISOString();
  const [{ data: courts }, { data: bookings }] = await Promise.all([
    supabase.from("courts").select("id, name, status").order("sort_order"),
    supabase.from("reservations").select("court_id, starts_at, ends_at, guest_name, profiles(full_name)").eq("status", "confirmed").lte("starts_at", now).gt("ends_at", now),
  ]);
  return <div><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Live operations</p><h1 className="mt-1 font-display text-3xl font-bold">Courts in use now</h1><p className="mt-1 text-sm text-ash">See every court and the confirmed booking currently using it.</p></div><AutoRefresh intervalMs={15000} /></div><div className="grid gap-3 lg:grid-cols-2">{(courts ?? []).map((court) => { const booking: any = (bookings ?? []).find((row) => row.court_id === court.id); return <article key={court.id} className="rounded-card border border-line bg-surface p-4 shadow-card"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{court.name}</h2><span className={booking ? "rounded-full bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay" : "rounded-full bg-court/10 px-2.5 py-1 text-xs font-semibold text-court"}>{booking ? "In use" : court.status === "active" ? "Available now" : court.status}</span></div>{booking ? <p className="mt-3 text-sm text-ash"><span className="font-semibold text-ink">{booking.guest_name || booking.profiles?.full_name || "Account customer"}</span> · {formatTime(booking.starts_at)}–{formatTime(booking.ends_at)}</p> : <p className="mt-3 text-sm text-ash">No confirmed booking at this time.</p>}</article>; })}</div></div>;
}
