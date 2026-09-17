import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const schema = z.object({ paymentId: z.string().uuid(), action: z.enum(["verify", "reject"]) });
const paymentIdSchema = z.string().uuid();

async function getStaffUser() {
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  return profile && ["staff", "admin"].includes(profile.role) ? user : null;
}

export async function GET(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("paymentId") ?? "";
  if (!paymentIdSchema.safeParse(paymentId).success || !(await getStaffUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = createServiceRoleClient();
  const { data: payment } = await db.from("payments").select("proof_url").eq("id", paymentId).single();
  if (!payment?.proof_url) return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
  const { data, error } = await db.storage.from("payment-proofs").createSignedUrl(payment.proof_url, 60);
  if (error || !data) return NextResponse.json({ error: "Could not open payment proof" }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const user = await getStaffUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const db = createServiceRoleClient();
  const { error } = await db.rpc("review_payment", { p_payment_id: input.data.paymentId, p_verifier_id: user.id, p_approve: input.data.action === "verify" });
  if (error) return NextResponse.json({ error: error.message || "Could not update payment" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
