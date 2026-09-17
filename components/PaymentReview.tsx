"use client";
import { useState } from "react";
import { formatPeso } from "@/lib/pricing";

export function PaymentReview({ payments }: { payments: any[] }) {
  const [rows, setRows] = useState(payments);
  const [message, setMessage] = useState("");
  async function review(paymentId: string, action: "verify" | "reject") {
    const r = await fetch("/api/admin/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, action }) });
    const d = await r.json();
    if (!r.ok) return setMessage(d.error);
    setRows(rows.filter((p) => p.id !== paymentId));
    setMessage(action === "verify" ? "Payment verified and reservation confirmed." : "Payment rejected and the slot released.");
  }
  async function openProof(paymentId: string) {
    const r = await fetch(`/api/admin/payments?paymentId=${paymentId}`);
    const d = await r.json();
    if (!r.ok) return setMessage(d.error);
    window.open(d.url, "_blank", "noopener,noreferrer");
  }
  return <div className="space-y-3">{message && <p className="rounded-card bg-court/10 p-3 text-sm text-court">{message}</p>}{rows.length ? rows.map((p) => <article key={p.id} className="rounded-card border border-line bg-surface p-4 shadow-card"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{p.reservations?.booking_number} · {p.reservations?.courts?.name}</p><p className="text-sm text-ash">{p.method.replace("_", " ")} · Ref: {p.reference_number}</p><p className="mt-1 font-semibold text-court">{formatPeso(p.amount)}</p></div><div className="flex gap-2"><button onClick={() => openProof(p.id)} className="rounded-card border border-line px-3 py-2 text-sm font-semibold text-court">View proof</button><button onClick={() => review(p.id, "reject")} className="rounded-card border border-clay px-3 py-2 text-sm font-semibold text-clay">Reject</button><button onClick={() => review(p.id, "verify")} className="rounded-card bg-court px-3 py-2 text-sm font-semibold text-white">Verify</button></div></div></article>) : <p className="rounded-card border border-dashed border-line p-6 text-center text-ash">No payments need review.</p>}</div>;
}
