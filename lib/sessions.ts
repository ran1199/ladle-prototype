"use client";

// Usability sessions (hidden Test controls → "Start a session"). For each task
// T1–T5 the recorder keeps: start/end time, taps inside the app, edits, wrong
// turns, whether it was completed, whether the participant accepted Ladle's
// estimate, and what they chose. Kept in this browser only: not part of
// "Export my data", not cleared by Reset; removed by "Delete session" or
// "Delete all data".

import { useSyncExternalStore } from "react";
import { DEMO_RECIPE_KEY } from "./ai/scripted";
import type { LadleEvent, LogVia } from "./events";
import { storage } from "./storage";

const KEY = "ladle:sessions:v1";

export type TaskId = "T1" | "T2" | "T3" | "T4" | "T5";
export const TASK_IDS: TaskId[] = ["T1", "T2", "T3", "T4", "T5"];

/** What each task asks, and what counts as meeting its target. */
export const TASK_INFO: Record<TaskId, { short: string; target: string }> = {
  T1: { short: "Add the air-fryer chicken video", target: "Saved in under 2 minutes" },
  T2: { short: "Log the plate", target: "Logged in 3 taps or fewer" },
  T3: { short: "Fix today’s oil", target: "One-step fix, with a choice made" },
  T4: { short: "Log the usual adobo", target: "Under 10 s, estimate unchanged" },
  T5: { short: "Add Grandma’s recipe card", target: "Recipe saved" },
};

export type TaskRecord = {
  task: TaskId;
  startedAt: string;
  endedAt: string | null;
  taps: number;
  edits: number;
  wrongTurns: number;
  completed: boolean;
  /** "End task" was pressed before the task's success event. */
  endedByModerator: boolean;
  /** T2 and T4: logged Ladle's suggestion unchanged. Null for other tasks. */
  acceptedEstimate: boolean | null;
  /** e.g. "Oil: 2 tbsp", "Portion 1 (suggested 1)", "Just this time". */
  choiceDetails: string;
  note: string;
};

export type Session = {
  id: string;
  participant: string;
  startedAt: string;
  endedAt: string | null;
  tasks: TaskRecord[];
  /** Switches to put back when the session ends (the pill and tour are hidden during it). */
  restore?: { hidePill?: boolean; hideTour?: boolean; treatAsThursday?: boolean };
};

type SessionStore = {
  sessions: Session[];
  /** The session in progress, if any. */
  currentId: string | null;
  /** Show the summary sheet for this session (after "End session"). */
  summaryId: string | null;
};

const EMPTY: SessionStore = { sessions: [], currentId: null, summaryId: null };

let snapshot: SessionStore | null = null;
const listeners = new Set<() => void>();

export function getSessions(): SessionStore {
  if (snapshot === null) snapshot = { ...EMPTY, ...storage.get<SessionStore>(KEY) };
  return snapshot;
}

function save(next: SessionStore) {
  snapshot = next;
  storage.set(KEY, next);
  listeners.forEach((l) => l());
}

export function useSessions(): SessionStore {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSessions,
    () => EMPTY,
  );
}

export function currentSession(store = getSessions()): Session | null {
  return store.sessions.find((s) => s.id === store.currentId) ?? null;
}

/** The task running now (started, not ended), if any. */
export function activeTask(session: Session | null): TaskRecord | null {
  const last = session?.tasks[session.tasks.length - 1];
  return last && last.endedAt === null ? last : null;
}

function updateCurrent(change: (s: Session) => Session) {
  const store = getSessions();
  save({
    ...store,
    sessions: store.sessions.map((s) => (s.id === store.currentId ? change(s) : s)),
  });
}

function updateActive(change: (t: TaskRecord) => TaskRecord) {
  updateCurrent((s) => {
    const active = activeTask(s);
    if (!active) return s;
    return { ...s, tasks: s.tasks.map((t) => (t === active ? change(t) : t)) };
  });
}

export function startSession(participant: string, restore: Session["restore"]): Session {
  const session: Session = {
    id: `session-${Date.now().toString(36)}`,
    participant: participant.trim() || "Participant",
    startedAt: new Date().toISOString(),
    endedAt: null,
    tasks: [],
    restore,
  };
  const store = getSessions();
  save({
    ...store,
    sessions: [...store.sessions, session],
    currentId: session.id,
    summaryId: null,
  });
  return session;
}

export function startTask(task: TaskId) {
  updateCurrent((s) => {
    const now = new Date().toISOString();
    // Starting a new task ends one still running.
    const tasks = s.tasks.map((t) =>
      t.endedAt === null ? { ...t, endedAt: now, endedByModerator: true } : t,
    );
    return {
      ...s,
      tasks: [
        ...tasks,
        {
          task,
          startedAt: now,
          endedAt: null,
          taps: 0,
          edits: 0,
          wrongTurns: 0,
          completed: false,
          endedByModerator: false,
          acceptedEstimate: null,
          choiceDetails: "",
          note: "",
        },
      ],
    };
  });
}

/** "End task": the moderator stops the task before its success event. */
export function endTaskByModerator() {
  updateActive((t) => ({ ...t, endedAt: new Date().toISOString(), endedByModerator: true }));
}

/** Ends the session and opens its summary. Returns the switches to put back. */
export function endSession(): Session["restore"] {
  const session = currentSession();
  if (!session) return undefined;
  endTaskByModerator();
  const store = getSessions();
  save({
    ...store,
    sessions: store.sessions.map((s) =>
      s.id === session.id ? { ...s, endedAt: new Date().toISOString() } : s,
    ),
    currentId: null,
    summaryId: session.id,
  });
  return session.restore;
}

export function closeSummary() {
  save({ ...getSessions(), summaryId: null });
}

export function setTaskNote(sessionId: string, index: number, note: string) {
  const store = getSessions();
  save({
    ...store,
    sessions: store.sessions.map((s) =>
      s.id === sessionId
        ? { ...s, tasks: s.tasks.map((t, i) => (i === index ? { ...t, note } : t)) }
        : s,
    ),
  });
}

export function deleteSession(sessionId: string) {
  const store = getSessions();
  save({
    sessions: store.sessions.filter((s) => s.id !== sessionId),
    currentId: store.currentId === sessionId ? null : store.currentId,
    summaryId: store.summaryId === sessionId ? null : store.summaryId,
  });
}

/** "Delete all data" removes every session too. */
export function clearSessions() {
  save(EMPTY);
}

/* ---------- Counting ---------- */

export function countTap() {
  updateActive((t) => ({ ...t, taps: t.taps + 1 }));
}

/** Tabs that move the participant towards each task; any other tab is a wrong turn. */
const HELPFUL_TABS: Record<TaskId, string[]> = {
  T1: ["Recipes"],
  T2: ["Camera", "Today"],
  T3: ["Today"],
  T4: ["Today", "Recipes"],
  T5: ["Recipes"],
};

const VIA_TEXT: Record<LogVia, string> = {
  "plate-photo": "plate photo",
  "portion-helper": "own photo with the portion helper",
  "one-tap": "one-tap Log",
  "portion-picker": "Log a portion (chips)",
  leftovers: "leftovers nudge",
  pantry: "Pantry",
  food: "other food",
  other: "other",
};

/**
 * What an app event means for the running task: a count to add, or success.
 * Pure, so it can be tested.
 */
export function applyEvent(t: TaskRecord, event: LadleEvent): TaskRecord {
  const done = (choiceDetails: string, acceptedEstimate: boolean | null = null): TaskRecord => ({
    ...t,
    endedAt: new Date().toISOString(),
    completed: true,
    choiceDetails,
    acceptedEstimate,
  });
  switch (event.type) {
    case "edit":
      return { ...t, edits: t.edits + 1 };
    case "wrong-turn":
      return { ...t, wrongTurns: t.wrongTurns + 1 };
    case "tab":
      return HELPFUL_TABS[t.task].includes(event.tab) ? t : { ...t, wrongTurns: t.wrongTurns + 1 };
    case "recipe-saved":
      if (t.task === "T1" && event.key === DEMO_RECIPE_KEY) {
        return done(`Oil: ${event.oilAnswer ?? "not asked"}`);
      }
      if (t.task === "T5" && event.key === "grandma-s-braised-pork") return done("Saved");
      return t;
    case "meal-logged": {
      const fromPhoto = event.via === "plate-photo" || event.via === "portion-helper";
      if (t.task === "T2" && fromPhoto) {
        const suggested =
          event.suggestedPortion !== undefined
            ? ` (suggested ${event.suggestedPortion})`
            : " (picked a recipe)";
        const which =
          event.recipeKey === DEMO_RECIPE_KEY
            ? ""
            : `; logged as ${event.recipeKey ?? "other food"}`;
        return done(
          `Portion ${event.portion}${suggested}${which}`,
          event.acceptedEstimate ?? false,
        );
      }
      if (t.task === "T4" && event.recipeId === "chicken-adobo") {
        const accepted =
          event.acceptedEstimate ?? ["one-tap", "leftovers", "pantry"].includes(event.via);
        return done(`Logged via ${VIA_TEXT[event.via]}, portion ${event.portion}`, accepted);
      }
      return t;
    }
    case "fix-applied":
      if (t.task === "T3" && event.recipeKey === DEMO_RECIPE_KEY) {
        return done(event.scope === "once" ? "Just this time" : "Always");
      }
      return t;
    default:
      return t;
  }
}

/** Feeds an app event to the running task (and notes "Update recipe?" answers after T3). */
export function recordEvent(event: LadleEvent) {
  const session = currentSession();
  if (!session) return;
  if (event.type === "suggestion-resolved") {
    // The "You usually brush on more oil" question comes right after T3's fix.
    const last = session.tasks[session.tasks.length - 1];
    if (last?.task === "T3" && last.completed && !/Update recipe/.test(last.choiceDetails)) {
      updateCurrent((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t === last
            ? {
                ...t,
                choiceDetails: `${t.choiceDetails}; Update recipe? ${event.accept ? "Yes" : "Not now"}`,
              }
            : t,
        ),
      }));
    }
    return;
  }
  if (!activeTask(session)) return;
  updateActive((t) => applyEvent(t, event));
}

/* ---------- Results ---------- */

export function durationSeconds(t: TaskRecord): number | null {
  if (!t.endedAt) return null;
  return Math.max(0, (new Date(t.endedAt).getTime() - new Date(t.startedAt).getTime()) / 1000);
}

/** Whether a task met its target (see TASK_INFO). */
export function targetMet(t: TaskRecord): boolean {
  if (!t.completed) return false;
  const s = durationSeconds(t) ?? Infinity;
  switch (t.task) {
    case "T1":
      return s < 120;
    case "T2":
      return t.taps <= 3;
    case "T3":
      return /Just this time|Always/.test(t.choiceDetails);
    case "T4":
      return s < 10 && t.acceptedEstimate === true;
    case "T5":
      return true;
  }
}

/* ---------- CSV ---------- */

export const CSV_COLUMNS = [
  "participant",
  "date",
  "task",
  "started_at",
  "ended_at",
  "duration_s",
  "taps",
  "edits",
  "wrong_turns",
  "completed",
  "accepted_estimate",
  "choice_details",
  "target_met",
  "moderator_note",
] as const;

/**
 * One CSV cell. Quotes values with commas, quotes or line breaks (doubling any
 * quotes inside), and puts ' before text starting with = + - @ so a
 * spreadsheet never runs it as a formula.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function localTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sessionRows(session: Session): string[][] {
  return session.tasks.map((t) => {
    const duration = durationSeconds(t);
    return [
      session.participant,
      localDate(session.startedAt),
      t.task,
      localTime(t.startedAt),
      localTime(t.endedAt),
      duration === null ? "" : duration.toFixed(1),
      String(t.taps),
      String(t.edits),
      String(t.wrongTurns),
      t.completed ? "yes" : t.endedByModerator ? "no (ended by moderator)" : "no",
      t.acceptedEstimate === null ? "" : t.acceptedEstimate ? "yes" : "no",
      t.choiceDetails,
      targetMet(t) ? "yes" : "no",
      t.note,
    ];
  });
}

/** The sessions as one CSV file (header + one row per task). */
export function toCSV(sessions: Session[]): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...sessions.flatMap(sessionRows).map((r) => r.map(csvCell).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Saves a CSV file to the user's device. */
export function downloadCSV(sessions: Session[], name: string) {
  const blob = new Blob([toCSV(sessions)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvName(session: Session | null): string {
  const date = localDate(new Date().toISOString());
  if (!session) return `ladle-sessions-${date}.csv`;
  const who = session.participant.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "") || "participant";
  return `ladle-session-${who}-${localDate(session.startedAt)}.csv`;
}
