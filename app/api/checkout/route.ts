import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const tokenSchema = z.string().uuid();

async function reservationForToken(reservationId: string, token: string) {
  const db = createServiceRoleClient();
  await db.rpc("expire_stale_holds");
  return db.from("reservations").select("id, booking_number, court_id, starts_at, ends_at, total_amount, status, hold_expires_at, courts(name)")
    .eq("id", reservationId).eq("checkout_token", token).single();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reservationId = url.searchParams.get("reservationId") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!z.string().uuid().safeParse(reservationId).success || !tokenSchema.safeParse(token).success) return NextResponse.json({ error: "Invalid checkout link" }, { status: 400 });
  const { data, error } = await reservationForToken(reservationId, token);
  if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ reservation: data });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = z.object({ reservationId: z.string().uuid(), token: tokenSchema, method: z.enum(["gcash", "bank_transfer"]), referenceNumber: z.string().trim().min(3).max(100) }).safeParse({ reservationId: form.get("reservationId"), token: form.get("token"), method: form.get("method"), referenceNumber: form.get("referenceNumber") });
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid payment reference" }, { status: 400 });
  const proof = form.get("proof");
  if (!(proof instanceof File) || proof.size === 0 || proof.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(proof.type)) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP payment proof under 5 MB" }, { status: 400 });
  const { reservationId, token, method, referenceNumber } = parsed.data;
  const { data: reservation, error } = await reservationForToken(reservationId, token);
  if (error || !reservation) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (reservation.status !== "pending_payment" || (reservation.hold_expires_at && new Date(reservation.hold_expires_at) < new Date())) return NextResponse.json({ error: "This payment hold has expired" }, { status: 409 });
  const db = createServiceRoleClient();
  const proofPath = `${reservationId}/${crypto.randomUUID()}.${proof.type.split("/")[1]}`;
  const { error: uploadError } = await db.storage.from("payment-proofs").upload(proofPath, proof, { contentType: proof.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Could not upload payment proof" }, { status: 500 });
  const { error: insertError } = await db.from("payments").insert({ reservation_id: reservationId, method, reference_number: referenceNumber, proof_url: proofPath, amount: reservation.total_amount, status: "pending" });
  if (insertError?.code === "23505") return NextResponse.json({ error: "A payment is already awaiting verification for this booking" }, { status: 409 });
  if (insertError) return NextResponse.json({ error: "Could not submit payment" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
