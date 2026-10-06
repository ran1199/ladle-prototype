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
};

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
