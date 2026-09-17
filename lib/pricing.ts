import type { PriceBreakdown } from "./types";

/**
 * Hourly Rate x Number of Hours = Total
 * Matches the spec exactly. `hours` may be fractional (e.g. 1.5) since
 * courts can be booked in 30-minute increments.
 */
export function calculatePrice(hourlyRate: number, hours: number): PriceBreakdown {
  if (hours <= 0) throw new Error("hours must be greater than 0");
  const total = Math.round(hourlyRate * hours * 100) / 100;
  return { hourlyRate, hours, total };
}

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function hoursBetween(startsAtISO: string, endsAtISO: string): number {
  const ms = new Date(endsAtISO).getTime() - new Date(startsAtISO).getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}
