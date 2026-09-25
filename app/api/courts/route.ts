import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { manilaDayBounds } from "@/lib/availability";

// GET /api/courts?date=2026-09-10
// Returns each active court plus the availability blocks (reservations +
// blocked_slots) that fall on the given date, via the public
// `court_availability` view — so no reservation/customer PII ever leaves
// the server for an anonymous visitor.
export async function GET(request: Request) {
  // This immediate cleanup is a fallback for local development and guarantees
  // customers never see an expired hold while the minute-based cron is waiting.
  await createServiceRoleClient().rpc("expire_stale_holds");
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // "YYYY-MM-DD"

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Missing or invalid ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const { start: dayStart, end: dayEnd } = manilaDayBounds(date);

  const [{ data: courts, error: courtsError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      supabase
        .from("courts")
        .select("id, name, hourly_rate, status, sort_order")
        .neq("status", "disabled")
        .order("sort_order"),
      supabase
        .from("court_availability")
        .select("court_id, starts_at, ends_at, kind")
        .lt("starts_at", dayEnd)
        .gt("ends_at", dayStart),
    ]);

  if (courtsError || blocksError) {
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }

  return NextResponse.json({ courts, blocks });
}
