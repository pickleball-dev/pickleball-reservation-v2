import { createClient } from "@/lib/supabase/server";
import { formatTime, formatDate, isSameDay } from "@/lib/availability";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CourtCountdown } from "@/components/CourtCountdown";

function playerName(row: any) {
  return row.guest_name || row.profiles?.full_name || "Account customer";
}

// Always hit the DB fresh — this page is meant to sit open on a monitor for hours.
export const dynamic = "force-dynamic";

export default async function CourtMonitorPage() {
  const supabase = createClient();
  const now = new Date().toISOString();

  const [{ data: courts }, { data: reservations }] = await Promise.all([
    supabase.from("courts").select("id, name, status").order("sort_order"),
    supabase
      .from("reservations")
      .select("court_id, starts_at, ends_at, guest_name, profiles(full_name)")
      .eq("status", "confirmed")
      .gt("ends_at", now)
      .order("starts_at", { ascending: true }),
  ]);

  const rows: any[] = reservations ?? [];

  return (
    <div className="min-h-screen bg-court-dark px-10 py-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ball">Live operations · Monitor</p>
          <h1 className="mt-1 font-display text-4xl font-bold">Live court queue</h1>
        </div>
        <AutoRefresh intervalMs={15000} />
      </div>

      <div className="grid gap-4">
        {(courts ?? []).map((court) => {
          const current = rows.find((r) => r.court_id === court.id && r.starts_at <= now && r.ends_at > now);
          const next = rows.find((r) => r.court_id === court.id && r.starts_at > now);
          const isDown = court.status !== "active";

          return (
            <div key={court.id} className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-card bg-white/5 px-8 py-6">
              <p className="w-40 shrink-0 font-display text-3xl font-bold">{court.name}</p>

              <span
                className={`shrink-0 rounded-md px-4 py-2 text-base font-bold uppercase tracking-wide ${
                  isDown ? "bg-clay text-white" : current ? "bg-ball text-ink" : "bg-court-light text-ball"
                }`}
              >
                {isDown ? court.status : current ? "In play" : "Available"}
              </span>

              <p className="w-56 shrink-0 truncate font-display text-2xl font-semibold">
                {current ? playerName(current) : "—"}
              </p>

              <p className="w-40 shrink-0 text-xl font-semibold text-ball">
                {current ? <CourtCountdown endsAt={current.ends_at} /> : "Open now"}
              </p>

            <p className="ml-auto text-lg text-white/70">
                {next ? (
                  <>
                    Next: {playerName(next)} ·{" "}
                    {isSameDay(next.starts_at, now) ? formatTime(next.starts_at) : `${formatDate(next.starts_at)}, ${formatTime(next.starts_at)}`}
                  </>
                ) : (
                  "No one queued"
                )}
            </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}