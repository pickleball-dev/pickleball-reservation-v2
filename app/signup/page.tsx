"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailRedirectTo = `${window.location.origin}/auth/confirm?next=/my-bookings`;
    const { data, error } = await createClient().auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo } });
    if (error) return setMessage(error.message);
    setMessage(data.session ? "Account created. Opening your dashboard…" : "Account created. Check your email to verify it; the link will open your dashboard.");
    if (data.session) window.location.assign("/my-bookings");
  }
  return <main className="mx-auto max-w-md p-4 sm:pt-16"><form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card"><p className="text-sm font-semibold uppercase tracking-wide text-court">Pickleball Club</p><h1 className="font-display text-2xl font-bold">Create your account</h1><p className="text-sm text-ash">New accounts are customer accounts. An administrator can assign staff or admin access after signup.</p><input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full rounded-card border border-line px-3 py-2.5" /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-card border border-line px-3 py-2.5" /><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (6+ characters)" className="w-full rounded-card border border-line px-3 py-2.5" /><button className="w-full rounded-card bg-court py-3 font-semibold text-white">Create account</button>{message && <p className="text-sm text-ash">{message}</p>}<p className="text-center text-sm text-ash">Already registered? <Link className="text-court underline" href="/login">Sign in</Link></p></form></main>;
}
