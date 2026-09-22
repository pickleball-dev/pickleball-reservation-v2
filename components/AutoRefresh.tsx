"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** How often to refresh, in milliseconds. Defaults to 15s. */
  intervalMs?: number;
}

/**
 * Renders nothing visible on its own — drop it into a Server Component page
 * to have that page's data silently re-fetch on an interval via
 * `router.refresh()`. Pauses while the tab is hidden/backgrounded so it
 * doesn't hammer the database when nobody's looking, and resumes (with an
 * immediate refresh) when the tab regains focus.
 */
export function AutoRefresh({ intervalMs = 15_000 }: Props) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    function tick() {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastUpdated(new Date());
    }

    const id = setInterval(tick, intervalMs);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Stamp the initial load time too, so the "updated" label has something
    // to show before the first interval fires.
    setLastUpdated(new Date());

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ash">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-court opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-court" />
      </span>
      Live
      {lastUpdated && (
        <span className="text-ash/70">
          · updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </span>
      )}
    </span>
  );
}