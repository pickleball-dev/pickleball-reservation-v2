"use client";

import { useEffect, useState } from "react";
import { CourtCard } from "./CourtCard";
import { BookingDrawer } from "./BookingDrawer";
import type { AvailabilityBlock, Court } from "@/lib/types";
import { AccountNav } from "./AccountNav";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingApp() {
  const [date, setDate] = useState(todayISODate());
  const [courts, setCourts] = useState<Court[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/courts?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCourts(
          (data.courts ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            hourlyRate: c.hourly_rate,
            status: c.status,
          }))
        );
        setBlocks(
          (data.blocks ?? []).map((b: any) => ({
            courtId: b.court_id,
            startsAt: b.starts_at,
            endsAt: b.ends_at,
            kind: b.kind,
          }))
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  const openCount = courts.filter((c) => c.status === "active").length;

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-5 sm:max-w-3xl sm:pt-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-court">🏓 Pickleball Club</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">Play more.<br />Book faster.</h1></div>
        <AccountNav />
      </header>

      <section className="mb-5 rounded-card bg-court p-4 text-white shadow-card">
        <p className="text-sm font-medium text-ball">Simple booking in 3 steps</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm"><div><span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-ball font-bold text-court">1</span>Choose court</div><div><span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/40">2</span>Send payment</div><div><span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/40">3</span>Get confirmed</div></div>
      </section>

      <div className="mb-5 flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
        <div>
          <label htmlFor="date" className="mb-1 block text-xs font-medium text-ash">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-card border border-line px-3 py-2 font-medium"
          />
        </div>
        <div className="text-right">
          <p className="score-num text-2xl text-court">
            {loading ? "–" : openCount}/{courts.length || 5}
          </p>
          <p className="text-xs text-ash">courts ready now</p>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-ash">Open 24 hours · Booked times are unavailable for selection · Bookings are held for 15 minutes while payment is submitted.</p>

      <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-card bg-line/50" />
          ))}

        {!loading &&
          courts.map((court, i) => (
            <CourtCard
              key={court.id}
              court={court}
              number={i + 1}
              blocks={blocks.filter((b) => b.courtId === court.id)}
              onSelect={() => setSelectedCourt(court)}
            />
          ))}
      </div>

      {selectedCourt && (
        <BookingDrawer
          court={selectedCourt}
          date={date}
          blocks={blocks.filter((b) => b.courtId === selectedCourt.id)}
          onClose={() => setSelectedCourt(null)}
        />
      )}
    </div>
  );
}
