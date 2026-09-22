"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ChangeEvent } from "react";

interface Props {
  /** Currently selected end date, YYYY-MM-DD. */
  defaultValue: string;
  /** Latest selectable date (today), YYYY-MM-DD — no future dates. */
  max: string;
}

/** Uncontrolled date picker that pushes ?end=YYYY-MM-DD onto the URL. */
export function SalesDateFilter({ defaultValue, max }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("end", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetToToday() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("end");
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-ash" htmlFor="sales-end-date">
        Week ending
      </label>
      <input
        id="sales-end-date"
        type="date"
        // key forces the uncontrolled input to remount (and pick up the new
        // defaultValue) whenever the server re-renders with a different date.
        key={defaultValue}
        defaultValue={defaultValue}
        max={max}
        onChange={onChange}
        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
      />
      {defaultValue !== max && (
        <button type="button" onClick={resetToToday} className="text-xs font-semibold text-court underline underline-offset-2">
          Reset to today
        </button>
      )}
    </div>
  );
}