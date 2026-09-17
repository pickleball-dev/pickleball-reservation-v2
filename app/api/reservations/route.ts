import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { calculatePrice, hoursBetween } from "@/lib/pricing";

const bodySchema = z.object({ courtId: z.string().uuid(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), guestName: z.string().trim().min(1).max(120).optional(), guestPhone: z.string().trim().min(5).max(30).optional() });
const EXCLUSION_VIOLATION = "23P01";

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { courtId, startsAt, endsAt, guestName, guestPhone } = parsed.data;
  const start = new Date(startsAt), end = new Date(endsAt);
  if (end <= start || end.getTime() - start.getTime() > 4 * 60 * 60 * 1000) return NextResponse.json({ error: "Choose a booking from 30 minutes up to 4 hours" }, { status: 400 });
  if (start < new Date()) return NextResponse.json({ error: "Cannot book a time in the past" }, { status: 400 });
  if (start.getUTCMinutes() % 30 !== 0 || end.getUTCMinutes() % 30 !== 0) return NextResponse.json({ error: "Bookings must start and end on a 30-minute interval" }, { status: 400 });

  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user && (!guestName || !guestPhone)) return NextResponse.json({ error: "Name and mobile number are required for guest bookings" }, { status: 400 });
  // Guest reservations need their new checkout token returned immediately. The
  // public RLS policy deliberately cannot select guest reservations, so all
  // validated booking work below uses the server-only service client.
  const supabase = createServiceRoleClient();
  await supabase.rpc("expire_stale_holds");
  if (user) await supabase.from("profiles").upsert({ id: user.id, full_name: String(user.user_metadata.full_name ?? "") }, { onConflict: "id", ignoreDuplicates: true });
  const { data: court, error: courtError } = await supabase.from("courts").select("id, hourly_rate, status").eq("id", courtId).single();
  if (courtError || !court) return NextResponse.json({ error: "Court not found" }, { status: 404 });
  if (court.status !== "active") return NextResponse.json({ error: "This court is unavailable" }, { status: 409 });

  const { total } = calculatePrice(court.hourly_rate, hoursBetween(startsAt, endsAt));
  const { data: settingRow } = await supabase.from("settings").select("value").eq("key", "hold_duration_minutes").single();
  const holdMinutes = typeof settingRow?.value === "number" ? settingRow.value : 15;
  const { data: bookingNumber } = await supabase.rpc("generate_booking_number");
  const { data: reservation, error } = await supabase.from("reservations").insert({
    booking_number: bookingNumber ?? `PB-${Date.now()}`, court_id: courtId, customer_id: user?.id ?? null,
    guest_name: user ? null : guestName!, guest_phone: user ? null : guestPhone!, starts_at: startsAt, ends_at: endsAt,
    total_amount: total, status: "pending_payment", hold_expires_at: new Date(Date.now() + holdMinutes * 60_000).toISOString(),
  }).select("id, booking_number, checkout_token, hold_expires_at").single();
  if (error) {
    if (error.code === EXCLUSION_VIOLATION) return NextResponse.json({ error: "That time is no longer available. Please choose another slot." }, { status: 409 });
    console.error("Reservation creation failed", { code: error.code, message: error.message, details: error.details });
    return NextResponse.json({ error: "Could not create reservation" }, { status: 500 });
  }
  return NextResponse.json({ reservation }, { status: 201 });
}
