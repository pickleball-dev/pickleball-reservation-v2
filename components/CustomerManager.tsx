"use client";
import { useState } from "react";

export function CustomerManager({ accounts, type }: { accounts: any[]; type: "customers" | "team" }) {
  const [rows, setRows] = useState(accounts);
  const [message, setMessage] = useState("");
  async function changeRole(id: string, role: string) {
    const r = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role }) });
    const d = await r.json(); if (!r.ok) return setMessage(d.error);
    const staysInThisList = type === "customers" ? role === "customer" : role === "staff" || role === "admin";
    setRows((current) => staysInThisList ? current.map((p) => p.id === id ? { ...p, role } : p) : current.filter((p) => p.id !== id));
    setMessage("Role updated. The account list was refreshed.");
  }
  const title = type === "customers" ? `Registered customers (${rows.length})` : `Staff & administrators (${rows.length})`;
  return <><p className="mb-3 text-sm text-court">{message}</p><PeopleTable title={title} rows={rows} onRoleChange={changeRole} /></>;
}

function PeopleTable({ title, rows, onRoleChange }: { title: string; rows: any[]; onRoleChange: (id: string, role: string) => void }) {
  return <section><h2 className="mb-3 font-display text-xl font-bold">{title}</h2><div className="overflow-x-auto rounded-card border border-line bg-surface"><table className="w-full text-left text-sm"><thead className="border-b border-line text-ash"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Registered</th><th className="p-3">Access role</th></tr></thead><tbody>{rows.length ? rows.map((p) => <tr key={p.id} className="border-b border-line last:border-0"><td className="p-3">{p.full_name || "No name supplied"}</td><td className="p-3">{p.phone || "—"}</td><td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td><td className="p-3"><select value={p.role} onChange={(e) => onRoleChange(p.id, e.target.value)} className="rounded border border-line px-2 py-1 capitalize"><option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option></select></td></tr>) : <tr><td colSpan={4} className="p-5 text-center text-ash">No registered accounts in this group.</td></tr>}</tbody></table></div></section>;
}
