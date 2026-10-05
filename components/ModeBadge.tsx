"use client";

// Small pill at the top of every screen, so visitors and test participants
// always know whether they are in Demo or Live AI mode.

import { useLadle } from "@/lib/store";

export function ModeBadge() {
  const state = useLadle();
  const live = state?.prefs.mode === "live";
  return (
    <span
      className="text-caption inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-3 font-medium text-ink-2"
      aria-label={live ? "Mode: Live AI" : "Mode: Demo"}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${live ? "bg-confirmed" : "bg-rough"}`}
      />
      {live ? "Live AI" : "Demo"}
    </span>
  );
}
