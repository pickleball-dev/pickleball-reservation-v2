import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/pricing";
import { formatTime, formatDate } from "@/lib/availability";

export default async function ReservationsPage() {
  const { data } = await createClient()
    .from("reservations")
    .select("booking_number, starts_at, ends_at, total_amount, status, guest_name, guest_phone, created_at, courts(name), profiles(full_name, phone)")
    .in("status", ["pending_payment", "confirmed"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold">Reservations</h1>
      <p className="mb-6 text-sm text-ash">Live holds and confirmed bookings. Payment approval is managed in Payments.</p>
      <div className="space-y-3">
        {data?.map((r: any) => (
          <article key={r.booking_number} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{r.booking_number} · {r.courts?.name}</p>
                <p className="text-sm text-ash">
                  {formatDate(r.starts_at)} · {formatTime(r.starts_at)}–{formatTime(r.ends_at)} · {r.guest_name || r.profiles?.full_name || "Account customer"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-court">{formatPeso(r.total_amount)}</p>
                <p className="text-xs uppercase text-ash">{r.status.replace("_", " ")}</p>
              </div>
            </div>
          </article>
        )) ?? <p className="text-ash">No live reservations.</p>}
      </div>
    </div>
  );
}