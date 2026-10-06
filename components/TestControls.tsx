"use client";

// Hidden test controls for usability sessions (press and hold the version line
// on the Me tab). Saved in this browser only.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actions } from "@/lib/store";
import { setTestFlags, useTestFlags, type TestSwitch } from "@/lib/testControls";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

function Toggle({
  label,
  hint,
  flag,
}: {
  label: string;
  hint: string;
  flag: TestSwitch;
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
      <ResetToTestStart onDone={onClose} />
      <div className="divide-y divide-line border-t border-line">
        <Toggle
          flag="showTimer"
          label="Show task timer"
          hint="A small stopwatch you can start, pause and reset."
        />
        <Toggle
          flag="showNextTask"
          label="Show the next test task"
          hint="Shows which of T1–T5 the participant hasn’t done yet."
        />
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
      <AgeBatches />
      <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}

function AgeBatches() {
  const [done, setDone] = useState(false);
  return (
    <div className="border-t border-line py-3">
      <button
        type="button"
        onClick={() => {
          actions.ageBatches(5);
          setDone(true);
        }}
        className="text-headline min-h-11 text-left text-accent-strong"
      >
        Make batches 5 days older
      </button>
      <p className="text-caption text-ink-2" aria-live="polite">
        {done
          ? "Done. Today and Pantry now ask “Still have it?”."
          : "To try the “Still have it?” question without waiting."}
      </p>
    </div>
  );
}

function ResetToTestStart({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="py-3">
      {confirming ? (
        <div className="rounded-[var(--radius-control)] border-2 border-estimate p-3">
          <p className="text-body">
            Restore Maya&rsquo;s starting data and reset the timer? Everything done in this browser
            is cleared.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                actions.resetDemo();
                setTestFlags({ failNext: false, timerStartedAt: null, timerElapsedMs: 0 });
                setConfirming(false);
                onDone();
                router.push("/");
              }}
            >
              Reset now
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setConfirming(true)}>
          Reset to test start
        </Button>
      )}
    </div>
  );
}
