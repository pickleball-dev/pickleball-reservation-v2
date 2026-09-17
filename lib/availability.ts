import type { AvailabilityBlock } from "./types";

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Client-side convenience check only — lets the UI grey out a slot instantly
 * without waiting on a round trip. It is NOT the source of truth: the
 * Postgres EXCLUDE constraint (see supabase/migrations/0001_init.sql) is what
 * actually prevents a double-booking, including races between two customers
 * submitting at the same moment.
 */
export function isSlotAvailable(
  blocks: AvailabilityBlock[],
  courtId: string,
  startsAt: string,
  endsAt: string
): boolean {
  return !blocks.some(
    (b) => b.courtId === courtId && rangesOverlap(startsAt, endsAt, b.startsAt, b.endsAt)
  );
}

/** Generates 30-minute-increment start-time options between open and close. */
export function generateTimeOptions(date: string, openTime: string, closeTime: string): string[] {
  const options: string[] = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  // Create dates with explicit Z to use UTC
  const cursor = new Date(`${date}T00:00:00Z`);
  cursor.setUTCHours(openH, openM, 0, 0); // ← Use setUTCHours
  const end = new Date(`${date}T00:00:00Z`);
  end.setUTCHours(closeH, closeM, 0, 0); // ← Use setUTCHours

  while (cursor < end) {
    options.push(cursor.toISOString());
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 30); // ← Use UTC
  }
  return options;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
