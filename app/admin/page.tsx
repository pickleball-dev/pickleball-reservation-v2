import { createClient } from "@/lib/supabase/server";
import { formatTime, manilaDayBounds } from "@/lib/availability";
import { formatPeso } from "@/lib/pricing";
import clsx from "clsx";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = createClient();
  const { start: todayStart, end: todayEnd } = manilaDayBounds(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  );

  const { data: courts } = await supabase.from("courts").select("*").order("sort_order");

  const { data: reservations } = await supabase
    .from("reservations")
    .select("*, courts(name), profiles(full_name)")
    .gte("starts_at", todayStart)
    .lt("starts_at", todayEnd)
    .in("status", ["pending_payment", "confirmed"])
    .order("starts_at");
  const { count: pendingPayments } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const byCourtId = new Map<string, typeof reservations>();
  (reservations ?? []).forEach((r: any) => {
    const list = byCourtId.get(r.court_id) ?? [];
    list.push(r);
    byCourtId.set(r.court_id, list);
  });

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Operations overview</p><h1 className="mt-1 font-display text-3xl font-bold">Good day, admin.</h1>
      <p className="mt-1 text-sm text-ash">
        {new Date(todayStart).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" })}
      </p></div><Link href="/admin/payments" className="rounded-card bg-court px-4 py-3 text-center text-sm font-semibold text-white shadow-card">Review payments →</Link></div>

      <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Active courts" value={`${(courts ?? []).filter(c => c.status === "active").length}/5`} tone="court" /><Metric label="Today&apos;s bookings" value={String(reservations?.length ?? 0)} /><Metric label="Pending payments" value={String(pendingPayments ?? 0)} tone="ball" /><Metric label="Confirmed today" value={String(reservations?.filter(r => r.status === "confirmed").length ?? 0)} /></section>
      <h2 className="mb-3 font-display text-xl font-bold">Today&apos;s court schedule</h2>

      <div className="space-y-3">
        {(courts ?? []).map((court) => {
          const list = byCourtId.get(court.id) ?? [];
          return (
            <div
              key={court.id}
              className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-display font-semibold">{court.name}</p>

              {court.status !== "active" ? (
                <span className="text-sm font-medium text-clay">
                  {court.status === "maintenance" ? "Under maintenance" : "Disabled"}
                </span>
              ) : list.length === 0 ? (
                <span className="text-sm text-ash">Available all day</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {list.map((r: any) => (
                    <span
                      key={r.id}
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        r.status === "confirmed"
                          ? "bg-court/10 text-court"
                          : "bg-ball/20 text-court-dark"
                      )}
                    >
                      {formatTime(r.starts_at)}–{formatTime(r.ends_at)} ·{" "}
                      {r.guest_name || r.profiles?.full_name || "Account customer"} · {r.status === "confirmed" ? "PAID" : "PENDING"} · {formatPeso(r.total_amount)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "court" | "ball" }) {
  return <div className={clsx("rounded-card border p-4 shadow-card", tone === "court" ? "border-court bg-court text-white" : tone === "ball" ? "border-ball bg-ball/20" : "border-line bg-surface")}><p className={clsx("text-xs font-semibold uppercase tracking-wide", tone === "court" ? "text-white/75" : "text-ash")}>{label}</p><p className="mt-2 font-display text-3xl font-bold">{value}</p></div>;
}
