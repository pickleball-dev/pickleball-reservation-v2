import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges Supabase's verification code and takes a verified customer to their dashboard. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") === "/my-bookings" ? "/my-bookings" : "/my-bookings";
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?message=verification_failed", url.origin));
}
