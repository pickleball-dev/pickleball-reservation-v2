"use client";

import { useEffect, useState } from "react";

interface Props {
  endsAt: string;
}

/** Ticks down locally every second so the display feels live between the page's auto-refreshes. */
export function CourtCountdown({ endsAt }: Props) {
  const [label, setLabel] = useState(() => computeLabel(endsAt));

  useEffect(() => {
    setLabel(computeLabel(endsAt));
    const id = setInterval(() => setLabel(computeLabel(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <>{label}</>;
}

function computeLabel(endsAt: string) {
  const msLeft = new Date(endsAt).getTime() - Date.now();
  if (msLeft <= 0) return "Wrapping up";
  const totalMinutes = Math.ceil(msLeft / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min left`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m left`;
}