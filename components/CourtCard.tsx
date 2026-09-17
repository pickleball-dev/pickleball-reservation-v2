import clsx from "clsx";
import { formatPeso } from "@/lib/pricing";
import { formatTime } from "@/lib/availability";
import type { AvailabilityBlock, Court } from "@/lib/types";

interface Props {
  court: Court;
  number: number;
  blocks: AvailabilityBlock[];
  onSelect: () => void;
}

export function CourtCard({ court, number, blocks, onSelect }: Props) {
  const isDisabled = court.status !== "active";
  const upcoming = [...blocks].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="score-num text-3xl text-court leading-none">{number}</span>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{court.name}</p>
            <p className="text-sm text-ash">{formatPeso(court.hourlyRate)} / hour</p>
          </div>
        </div>
        <StatusPill isDisabled={isDisabled} hasUpcoming={upcoming.length > 0} />
      </div>

      {upcoming.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3">
          {upcoming.slice(0, 3).map((b, i) => (
            <li key={i} className="text-sm text-ash">
              {formatTime(b.startsAt)} – {formatTime(b.endsAt)}
              <span className="ml-2 text-xs uppercase tracking-wide text-ash/70">
                {b.kind === "blocked" ? "unavailable" : "booked"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onSelect}
        disabled={isDisabled}
        className={clsx(
          "mt-4 w-full rounded-card py-2.5 text-sm font-semibold transition-colors",
          isDisabled
            ? "cursor-not-allowed bg-line text-ash"
            : "bg-court text-white hover:bg-court-light active:bg-court-dark"
        )}
      >
        {isDisabled ? "Unavailable" : "Book this court"}
      </button>
    </div>
  );
}

function StatusPill({ isDisabled, hasUpcoming }: { isDisabled: boolean; hasUpcoming: boolean }) {
  if (isDisabled) {
    return (
      <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay">
        Maintenance
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        hasUpcoming ? "bg-ball/20 text-court-dark" : "bg-court/10 text-court"
      )}
    >
      {hasUpcoming ? "Partly booked" : "Open all day"}
    </span>
  );
}
