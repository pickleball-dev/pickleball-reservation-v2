import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
const schema = z.object({ id: z.string().uuid(), status: z.enum(["active", "maintenance", "disabled"]), hourlyRate: z.number().min(0).max(100000) });
export async function PATCH(request: Request) {
  const input = schema.safeParse(await request.json()); if (!input.success) return NextResponse.json({ error: "Invalid court details" }, { status: 400 });
  const session = createClient(); const { data: { user } } = await session.auth.getUser();
  const { data: profile } = user ? await session.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (!profile || !["staff", "admin"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { error } = await createServiceRoleClient().from("courts").update({ status: input.data.status, hourly_rate: input.data.hourlyRate }).eq("id", input.data.id);
  return error ? NextResponse.json({ error: "Could not update court" }, { status: 500 }) : NextResponse.json({ ok: true });
}
