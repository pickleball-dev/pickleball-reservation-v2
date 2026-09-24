"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/admin", label: "Overview", icon: "▦" },
  { href: "/admin/reservations", label: "Reservations", icon: "◷" },
  { href: "/admin/payments", label: "Payments", icon: "₱" },
  { href: "/admin/availability", label: "Availability", icon: "◷" },
  { href: "/admin/courts", label: "Courts", icon: "⌁" },
  { href: "/admin/court-usage", label: "Courts in use", icon: "◉" },
  { href: "/admin/sales", label: "Confirmed sales", icon: "₱", adminOnly: true },
  { href: "/admin/customers", label: "Customer accounts", icon: "◉", adminOnly: true },
  { href: "/admin/team", label: "Staff / admin accounts", icon: "★", adminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { const client = createClient(); client.auth.getUser().then(async ({ data }) => { if (!data.user) return; const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).single(); setIsAdmin(profile?.role === "admin"); }); }, []);
  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin);
    async function signOut() { await createClient().auth.signOut(); router.push("/"); router.refresh(); }

  // The monitor view is meant to fill an entire screen (a TV mounted courtside),
  // so it skips the sidebar/header shell entirely instead of being squeezed into it.
  if (pathname === "/admin/court-usage/monitor") {
    return <>{children}</>;
  }

  return <div className="min-h-screen bg-chalk"><header className="border-b border-line bg-surface sm:hidden"><div className="flex items-center justify-between px-4 py-3"><p className="font-display text-lg font-bold text-court">🏓 Club Admin</p><button onClick={signOut} className="text-sm font-semibold text-ash">Sign out</button></div><nav className="flex gap-1 overflow-x-auto px-3 pb-3">{visibleNav.map(item => <Link key={item.href} href={item.href} className={clsx("shrink-0 rounded-card px-3 py-2 text-sm font-semibold", pathname === item.href ? "bg-court text-white" : "text-ash hover:bg-court/5")}>{item.label}</Link>)}</nav></header><div className="mx-auto flex min-h-screen max-w-7xl"><aside className="hidden w-64 shrink-0 border-r border-line bg-surface p-5 sm:flex sm:flex-col"><div className="mb-9"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-ash">Pickleball Club</p><p className="mt-1 font-display text-2xl font-bold text-court">Admin center</p></div><nav className="space-y-1">{visibleNav.map(item => <Link key={item.href} href={item.href} className={clsx("flex items-center gap-3 rounded-card px-3 py-3 text-sm font-semibold", pathname === item.href ? "bg-court text-white shadow-card" : "text-ash hover:bg-court/5 hover:text-court")}><span className="w-4 text-center">{item.icon}</span>{item.label}</Link>)}</nav><div className="mt-auto space-y-2"><Link href="/" className="block rounded-card border border-line px-3 py-2 text-center text-sm font-semibold text-court">View booking site ↗</Link><button onClick={signOut} className="w-full px-3 py-2 text-sm font-semibold text-ash hover:text-clay">Sign out</button></div></aside><main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-9">{children}</main></div></div>;
}
