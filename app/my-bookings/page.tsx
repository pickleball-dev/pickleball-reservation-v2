import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/pricing";
import { formatTime, formatDate } from "@/lib/availability";

export default async function MyBookings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: bookings } = await supabase.from("reservations").select("booking_number, starts_at, ends_at, total_amount, status, courts(name)").eq("customer_id", user.id).order("starts_at", { ascending: false });
  return <main className="mx-auto max-w-2xl p-4 sm:pt-10"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-court">Pickleball Club</p><h1 className="font-display text-3xl font-bold">My bookings</h1></div><Link href="/" className="text-sm font-medium text-court underline">Book a court</Link></div><div className="space-y-3">{bookings?.length ? bookings.map((b: any) => <article key={b.booking_number} className="rounded-card border border-line bg-surface p-4 shadow-card"><div className="flex justify-between gap-4"><div><p className="font-semibold">{b.courts?.name} · {b.booking_number}</p><p className="mt-1 text-sm text-ash">{formatDate(b.starts_at)} · {formatTime(b.starts_at)}–{formatTime(b.ends_at)}</p></div><div className="text-right"><p className="font-semibold text-court">{formatPeso(b.total_amount)}</p><p className="text-xs uppercase text-ash">{b.status.replace("_", " ")}</p></div></div></article>) : <p className="rounded-card border border-dashed border-line p-6 text-center text-ash">You have no bookings yet.</p>}</div></main>;
}
