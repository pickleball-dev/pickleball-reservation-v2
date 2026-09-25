import type { AvailabilityBlock } from "./types";

export const BOOKING_TIME_ZONE = "Asia/Manila";

/** Convert a wall-clock time in the booking timezone to a UTC ISO timestamp. */
export function manilaDateTimeToIso(date: string, hour: number, minute = 0): string {
  const [year, month, day] = date.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wallClock;

  // Resolve the timezone offset with Intl, independent of the machine's TZ.
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BOOKING_TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
      Number(value.year), Number(value.month) - 1, Number(value.day),
      Number(value.hour), Number(value.minute), Number(value.second)
    );
    const next = wallClock - (representedAsUtc - instant);
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

export function todayInManila(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function manilaDayBounds(date: string): { start: string; end: string } {
  const [year, month, day] = date.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return {
    start: manilaDateTimeToIso(date, 0),
    end: manilaDateTimeToIso(nextDay, 0),
  };
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** Client-side convenience check; the database constraint remains authoritative. */
export function isSlotAvailable(
  blocks: AvailabilityBlock[], courtId: string, startsAt: string, endsAt: string
): boolean {
  return !blocks.some((b) => b.courtId === courtId && rangesOverlap(startsAt, endsAt, b.startsAt, b.endsAt));
}

/** Generates 30-minute slots in Manila local time and returns UTC instants. */
export function generateTimeOptions(date: string, openTime: string, closeTime: string): string[] {
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  const startMinutes = openH * 60 + openM;
  let endMinutes = closeH * 60 + closeM;
  if (endMinutes <= startMinutes && closeTime === "24:00") endMinutes = 1440;
  const options: string[] = [];
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    const slotDate = new Date(Date.UTC(year, month - 1, day + Math.floor(minutes / 1440)));
    const slotDateKey = slotDate.toISOString().slice(0, 10);
    const minuteOfDay = minutes % 1440;
    options.push(manilaDateTimeToIso(slotDateKey, Math.floor(minuteOfDay / 60), minuteOfDay % 60));
  }
  return options;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    timeZone: BOOKING_TIME_ZONE, hour: "numeric", minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: BOOKING_TIME_ZONE, month: "short", day: "numeric", year: "numeric",
  });
}

export function isSameDay(aIso: string, bIso: string): boolean {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: BOOKING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  };
  return new Date(aIso).toLocaleDateString("en-CA", options) === new Date(bIso).toLocaleDateString("en-CA", options);
}
