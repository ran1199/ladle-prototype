"use client";

// Hidden test controls for usability sessions (press and hold the version line
// on the Me tab). Saved in this browser only.

import { setTestFlags, useTestFlags, type TestFlags } from "@/lib/testControls";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

function Toggle({
  label,
  hint,
  flag,
}: {
  label: string;
  hint: string;
  flag: keyof TestFlags;
}) {
  const flags = useTestFlags();
  const on = !!flags[flag];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setTestFlags({ [flag]: !on })}
      className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="text-headline block">{label}</span>
        <span className="text-caption text-ink-2">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`flex h-8 w-13 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
          on ? "bg-confirmed" : "bg-surface-2"
        }`}
      >
        <span
          className={`size-6 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
            on ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}

export function TestControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Test controls">
      <p className="text-caption text-ink-2">For usability sessions. Saved in this browser only.</p>
      <div className="mt-2 divide-y divide-line">
        <Toggle
          flag="failNext"
          label="Simulate an AI error on the next request"
          hint="The next import, plate photo or estimate fails once, then this turns itself off."
        />
        <Toggle
          flag="hidePill"
          label="Hide the Prototype pill"
          hint="For clean screenshots and recordings."
        />
      </div>
      <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}
