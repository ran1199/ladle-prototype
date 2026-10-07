"use client";

// Listens while a usability session is running: counts taps inside the app
// (not on the moderator's test tools), Back/Cancel taps as wrong turns, and
// passes the app's events (recipe saved, meal logged, fix applied…) to the
// running task. Also shows the session summary after "End session".

import { useEffect, type RefObject } from "react";
import { emitEvent, onEvent } from "@/lib/events";
import { closeSummary, countTap, recordEvent, useSessions } from "@/lib/sessions";
import { Sheet } from "./Sheet";
import { SessionSummary } from "./SessionSummary";
import { Button } from "./ui";

/** Buttons and links that undo a step: tapping one is a wrong turn. */
const BACK = /^(?:back|cancel|discard|close camera|‹.*)$/i;

function accessibleName(el: HTMLElement): string {
  return (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
}

export function SessionRecorder({ root }: { root: RefObject<HTMLElement | null> }) {
  const { currentId, summaryId, sessions } = useSessions();
  const recording = currentId !== null;

  useEffect(() => {
    if (!recording) return;
    const stop = onEvent(recordEvent);
    const el = root.current;
    if (!el) return stop;
    const inApp = (target: EventTarget | null) =>
      target instanceof Element && !target.closest("[data-test-overlay]");
    const onPointerDown = (e: PointerEvent) => {
      if (inApp(e.target)) countTap();
    };
    const onClick = (e: MouseEvent) => {
      if (!inApp(e.target)) return;
      const control = (e.target as Element).closest<HTMLElement>("button, a");
      const backLink = control?.dataset.back !== undefined;
      if (control && (backLink || BACK.test(accessibleName(control)))) {
        emitEvent({ type: "wrong-turn", what: accessibleName(control) });
      }
    };
    el.addEventListener("pointerdown", onPointerDown, true);
    el.addEventListener("click", onClick, true);
    return () => {
      stop();
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("click", onClick, true);
    };
  }, [recording, root]);

  const summary = sessions.find((s) => s.id === summaryId) ?? null;
  return (
    <Sheet open={summary !== null} onClose={closeSummary} title="Session summary">
      {summary && <SessionSummary session={summary} />}
      <Button variant="secondary" className="mt-2 w-full" onClick={closeSummary}>
        Done
      </Button>
    </Sheet>
  );
}
