"use client";

import { useEffect, useMemo, useState } from "react";
import { calculatePrice, formatPeso } from "@/lib/pricing";
import { generateTimeOptions, formatTime, isSlotAvailable } from "@/lib/availability";
import type { AvailabilityBlock, Court } from "@/lib/types";

interface Props {
  court: Court;
  date: string;
  blocks: AvailabilityBlock[];
  onClose: () => void;
}

const HOUR_OPTIONS = [1, 1.5, 2, 2.5, 3, 4];

type Step = "select" | "holding" | "confirmed" | "error";

export function BookingDrawer({ court, date, blocks, onClose }: Props) {
  const [startsAt, setStartsAt] = useState<string>("");
  const [hours, setHours] = useState(1);
  const [step, setStep] = useState<Step>("select");
  const [errorMsg, setErrorMsg] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [holdSeconds, setHoldSeconds] = useState(15 * 60);

  // The facility operates 24/7. "24:00" rolls over to midnight of the
  // following day, allowing late-night bookings without a separate UI.
  const timeOptions = useMemo(() => generateTimeOptions(date, "00:00", "24:00").filter((time) => new Date(time) > new Date()), [date]);

  const endsAt = useMemo(() => {
    if (!startsAt) return "";
    return new Date(new Date(startsAt).getTime() + hours * 60 * 60 * 1000).toISOString();
  }, [startsAt, hours]);

  const available = startsAt ? isSlotAvailable(blocks, court.id, startsAt, endsAt) : true;
  const { total } = useMemo(() => {
  // If no start time selected yet, return a default
  if (!startsAt) return { hourlyRate: 0, hours: 0, total: 0 };
  // Otherwise calculate the real price
  return calculatePrice(court.hourlyRate, hours);
}, [court.hourlyRate, hours, startsAt]);

  useEffect(() => {
    if (step !== "holding") return;
    if (holdSeconds <= 0) {
      setStep("error");
      setErrorMsg("Your hold expired. Please choose a time again.");
      return;
    }
    const t = setTimeout(() => setHoldSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, holdSeconds]);

  async function handleConfirm() {
  if (!startsAt || !available || !guestName.trim() || !guestPhone.trim()) return;
  setStep("holding");
  setHoldSeconds(15 * 60);

  try {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courtId: court.id, startsAt, endsAt, guestName, guestPhone }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStep("error");
      setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setBookingNumber(data.reservation.booking_number);
    setCheckoutUrl(`/checkout/${data.reservation.id}?token=${data.reservation.checkout_token}`);
    setStep("confirmed");
  } catch (error) {
    setStep("error");
    setErrorMsg("Network error. Please check your connection and try again.");
  }
}

  const mm = String(Math.floor(holdSeconds / 60)).padStart(2, "0");
  const ss = String(holdSeconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-card bg-surface p-5 sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{court.name}</h2>
          <button onClick={onClose} className="rounded-card px-2 py-1 text-sm font-medium text-ash hover:bg-chalk hover:text-ink" aria-label="Back to courts">
            ← Back
          </button>
        </div>

        {step === "select" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ash">Your name</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full rounded-card border border-line px-3 py-2.5" placeholder="Juan dela Cruz" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ash">Mobile number</label>
              <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="w-full rounded-card border border-line px-3 py-2.5" placeholder="09XX XXX XXXX" inputMode="tel" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ash">Start time</label>
              <select
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-card border border-line px-3 py-2.5"
              >
                <option value="">Select a time</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {formatTime(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ash">Number of hours</label>
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full rounded-card border border-line px-3 py-2.5"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
            </div>

            {startsAt && !available && (
              <p className="rounded-card bg-clay/10 px-3 py-2 text-sm text-clay">
                That time overlaps with an existing booking. Please choose another start time or
                fewer hours.
              </p>
            )}

            {startsAt && available && (
              <div className="rounded-card border border-line bg-chalk p-3">
                <div className="flex justify-between text-sm text-ash">
                  <span>{formatPeso(court.hourlyRate)} × {hours}h</span>
                  <span>{formatTime(startsAt)} – {formatTime(endsAt)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="score-num text-2xl text-court">{formatPeso(total)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!startsAt || !available || !guestName.trim() || !guestPhone.trim()}
              className="w-full rounded-card bg-court py-3 font-semibold text-white transition-colors hover:bg-court-light disabled:cursor-not-allowed disabled:bg-line disabled:text-ash"
            >
              Continue to payment
            </button>
          </div>
        )}

        {step === "holding" && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-clay">
              Payment pending
            </p>
            <p className="score-num text-4xl text-court">
              {mm}:{ss}
            </p>
            <p className="text-sm text-ash">Confirming your hold…</p>
          </div>
        )}

        {step === "confirmed" && (
          <div className="space-y-3 text-center">
            <p className="font-display text-lg font-semibold text-court">Slot held ✓</p>
            <p className="text-sm text-ash">Booking # {bookingNumber}</p>
            <p className="text-sm text-ash">
              Complete payment within {mm}:{ss} to confirm this reservation. Next step:
              choose GCash or bank transfer.
            </p>
            <button
              onClick={() => { window.location.href = checkoutUrl; }}
              className="w-full rounded-card bg-court py-3 font-semibold text-white hover:bg-court-light"
            >
              Next: payment details →
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-clay">{errorMsg}</p>
            <button
              onClick={() => setStep("select")}
              className="w-full rounded-card bg-court py-3 font-semibold text-white hover:bg-court-light"
            >
              Choose another time
            </button>
            <button onClick={onClose} className="w-full py-2 text-sm font-semibold text-ash hover:text-court">Back to courts</button>
          </div>
        )}
      </div>
    </div>
  );
}
