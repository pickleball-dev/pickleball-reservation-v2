"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AccountNav() {
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  useEffect(() => { const client = createClient(); client.auth.getUser().then(({ data }) => setSignedIn(!!data.user)); const { data: listener } = client.auth.onAuthStateChange((_event, session) => setSignedIn(!!session)); return () => listener.subscription.unsubscribe(); }, []);
  if (!signedIn) return <Link href="/login" className="rounded-card border border-line px-3 py-2 text-sm font-semibold text-court">Sign in</Link>;
  async function signOut() { await createClient().auth.signOut(); router.push("/"); router.refresh(); }
  return <div className="flex gap-2"><Link href="/my-bookings" className="rounded-card border border-line px-3 py-2 text-sm font-semibold text-court">My bookings</Link><button onClick={signOut} className="rounded-card border border-line px-3 py-2 text-sm font-semibold text-ash">Log out</button></div>;
}
