"use client";

// Hidden controls for usability sessions (opened by pressing and holding the
// version line on the Me tab). Kept in this browser only.

import { useSyncExternalStore } from "react";
import { storage } from "./storage";

const KEY = "ladle:test:v1";

export type TestFlags = {
  /** The next AI request fails with a friendly error, then this switches itself off. */
  failNext?: boolean;
  /** Hide the "Prototype" pill (for clean screenshots or recordings). */
  hidePill?: boolean;
  /** Show the floating task timer (a stopwatch for the moderator). */
  showTimer?: boolean;
  /** Show which test task (T1–T5) is next. */
  showNextTask?: boolean;
  /** Show the floating test tools at the top of the screen instead of the bottom. */
  overlayTop?: boolean;
  /** Stopwatch: when it was started (ms since 1970), or null when paused. */
  timerStartedAt?: number | null;
  /** Stopwatch: time counted before the current run. */
  timerElapsedMs?: number;
  /** Hide the "Try Ladle in 60 seconds" card on Today (on during test sessions). */
  hideTour?: boolean;
  /** Suggestions treat today as Thursday, so the usual adobo comes first (task T4). */
  treatAsThursday?: boolean;
};

/** On/off switches (the other fields are the stopwatch's numbers). */
export type TestSwitch =
  | "failNext"
  | "hidePill"
  | "showTimer"
  | "showNextTask"
  | "hideTour"
  | "treatAsThursday";

const listeners = new Set<() => void>();
let snapshot: TestFlags | null = null;

export function getTestFlags(): TestFlags {
  if (snapshot === null) snapshot = storage.get<TestFlags>(KEY) ?? {};
  return snapshot;
}

export function setTestFlags(changes: TestFlags): void {
  snapshot = { ...getTestFlags(), ...changes };
  storage.set(KEY, snapshot);
  listeners.forEach((l) => l());
}

const EMPTY: TestFlags = {};

/** The current flags; re-renders when they change. Empty on the server. */
export function useTestFlags(): TestFlags {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTestFlags,
    () => EMPTY,
  );
}
