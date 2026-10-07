"use client";

// Hidden test controls for usability sessions (press and hold the version line
// on the Me tab). Saved in this browser only.

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { formatTime } from "@/lib/format";
import {
  csvName,
  deleteSession,
  downloadCSV,
  startSession,
  targetMet,
  useSessions,
} from "@/lib/sessions";
import { actions } from "@/lib/store";
import { getTestFlags, setTestFlags, useTestFlags, type TestSwitch } from "@/lib/testControls";
import { SessionSummary } from "./SessionSummary";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

function Toggle({ label, hint, flag }: { label: string; hint: string; flag: TestSwitch }) {
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
  // One sheet at a time: a past session's summary opens inside this sheet.
  const [viewing, setViewing] = useState<string | null>(null);
  const { sessions } = useSessions();
  const shown = sessions.find((s) => s.id === viewing) ?? null;

  return (
    <Sheet
      open={open}
      onClose={() => {
        setViewing(null);
        onClose();
      }}
      title={shown ? "Session summary" : "Test controls"}
    >
      {shown ? (
        <>
          <SessionSummary session={shown} />
          <Button variant="secondary" className="mt-2 w-full" onClick={() => setViewing(null)}>
            Back
          </Button>
        </>
      ) : (
        <>
          <p className="text-caption text-ink-2">
            For usability sessions. Saved in this browser only.
          </p>
          <StartSession onDone={onClose} />
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
            <Toggle
              flag="hideTour"
              label="Hide the 60-second tour"
              hint="The “Try Ladle in 60 seconds” card on Today."
            />
            <Toggle
              flag="treatAsThursday"
              label="Treat today as Thursday"
              hint="Maya’s usual Thursday adobo comes first in suggestions (task T4)."
            />
          </div>
          <AgeBatches />
          <PastSessions onView={setViewing} />
          <Button variant="secondary" className="mt-4 w-full" onClick={onClose}>
            Done
          </Button>
        </>
      )}
    </Sheet>
  );
}

/** Participant ID + "Start a session": reset to test start, then record T1–T5. */
function StartSession({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { sessions, currentId } = useSessions();
  const [participant, setParticipant] = useState("");
  const id = useId();
  const suggested = `P${String(sessions.length + 1).padStart(2, "0")}`;

  if (currentId) {
    return (
      <p className="text-body mt-3 rounded-[var(--radius-control)] bg-surface-2 p-3">
        A session is running. Use the dark test bar to start tasks, and End to finish.
      </p>
    );
  }

  function start() {
    const flags = getTestFlags();
    actions.resetDemo();
    startSession(participant || suggested, {
      hidePill: flags.hidePill,
      hideTour: flags.hideTour,
      treatAsThursday: flags.treatAsThursday,
    });
    setTestFlags({
      failNext: false,
      timerStartedAt: null,
      timerElapsedMs: 0,
      hidePill: true,
      hideTour: true,
      treatAsThursday: true,
      overlayTop: true,
    });
    onDone();
    router.push("/");
  }

  return (
    <div className="mt-3 rounded-[var(--radius-control)] border border-line p-3">
      <label htmlFor={id} className="text-headline">
        Participant ID
      </label>
      <input
        id={id}
        value={participant}
        onChange={(e) => setParticipant(e.target.value)}
        placeholder={suggested}
        autoComplete="off"
        className="text-body mt-2 min-h-12 w-full rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2"
      />
      <p className="text-caption mt-2 text-ink-2">
        Starts from Maya&rsquo;s data, hides the Prototype pill and the tour, and treats today as
        Thursday. Tell the participant the AI is simulated.
      </p>
      <Button className="mt-3 w-full" onClick={start}>
        Start a session
      </Button>
    </div>
  );
}

function PastSessions({ onView }: { onView: (id: string) => void }) {
  const { sessions, currentId } = useSessions();
  const [deleting, setDeleting] = useState<string | null>(null);
  const past = sessions
    .filter((s) => s.id !== currentId)
    .slice()
    .reverse();
  if (past.length === 0) return null;

  return (
    <section aria-labelledby="past-sessions" className="border-t border-line pt-3">
      <h3 id="past-sessions" className="text-headline">
        Past sessions
      </h3>
      <ul className="mt-1 divide-y divide-line">
        {past.map((s) => (
          <li key={s.id} className="py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onView(s.id)}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
              >
                <span className="text-headline truncate">{s.participant}</span>
                <span className="text-caption text-ink-2">
                  {new Date(s.startedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {formatTime(s.startedAt)} · {s.tasks.length}{" "}
                  {s.tasks.length === 1 ? "task" : "tasks"} · {s.tasks.filter(targetMet).length}{" "}
                  targets met
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeleting(s.id)}
                className="text-caption min-h-11 shrink-0 rounded-lg px-2 font-semibold text-accent-strong"
              >
                Delete session
              </button>
            </div>
            {deleting === s.id && (
              <div className="mt-2 rounded-[var(--radius-control)] border-2 border-estimate p-3">
                <p className="text-body">
                  Delete {s.participant}&rsquo;s session? This can&rsquo;t be undone.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      deleteSession(s.id);
                      setDeleting(null);
                    }}
                  >
                    Delete
                  </Button>
                  <Button variant="secondary" onClick={() => setDeleting(null)}>
                    Keep it
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        className="mt-2 w-full"
        onClick={() => downloadCSV(past.slice().reverse(), csvName(null))}
      >
        Save all as one CSV
      </Button>
    </section>
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
                setTestFlags({
                  failNext: false,
                  timerStartedAt: null,
                  timerElapsedMs: 0,
                });
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
