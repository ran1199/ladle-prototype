"use client";

// Floating test tools for the moderator (switched on in Test controls):
// a stopwatch and the next usability task, or, during a recorded session,
// Start T1–T5 / End task / End session. Shown inside the phone screen, at the
// bottom (above the tab bar) or the top; tap ↕ to move them. Taps here are
// never counted as the participant's.

import { useEffect, useState } from "react";
import { useLadle } from "@/lib/store";
import { setTestFlags, useTestFlags } from "@/lib/testControls";
import {
  activeTask,
  currentSession,
  endSession,
  endTaskByModerator,
  startTask,
  TASK_IDS,
  TASK_INFO,
  useSessions,
  type Session,
} from "@/lib/sessions";
import { nextTask } from "@/lib/testTasks";

function elapsedMs(startedAt: number | null | undefined, before = 0, now = Date.now()) {
  return before + (startedAt ? now - startedAt : 0);
}

function format(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Stopwatch() {
  const flags = useTestFlags();
  const running = !!flags.timerStartedAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const ms = elapsedMs(flags.timerStartedAt, flags.timerElapsedMs ?? 0, running ? now : undefined);
  const btn = "flex size-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25";

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="tabular min-w-[46px] text-[15px] font-semibold"
        aria-label={`Timer ${format(ms)}`}
      >
        {format(ms)}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={running ? "Pause timer" : "Start timer"}
        onClick={() =>
          running
            ? setTestFlags({ timerStartedAt: null, timerElapsedMs: ms })
            : setTestFlags({ timerStartedAt: Date.now() })
        }
      >
        {running ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <rect x="2" y="1" width="3" height="10" rx="1" />
            <rect x="7" y="1" width="3" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M3 1.5v9l7.5-4.5z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className={btn}
        aria-label="Reset timer"
        onClick={() => setTestFlags({ timerStartedAt: null, timerElapsedMs: 0 })}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" />
        </svg>
      </button>
    </div>
  );
}

/** Seconds since the task started, ticking. */
function TaskClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular">{format(now - new Date(startedAt).getTime())}</span>;
}

/** The moderator's session controls: Start T1–T5, End task, End session. */
function SessionBar({ session }: { session: Session }) {
  const active = activeTask(session);
  const btn =
    "flex h-11 min-w-11 items-center justify-center rounded-full bg-white/15 px-2 text-[13px] font-semibold hover:bg-white/25";
  if (active) {
    return (
      <>
        <span className="text-caption font-semibold" aria-live="polite">
          {active.task} · <TaskClock startedAt={active.startedAt} />
        </span>
        <button type="button" className={btn} onClick={endTaskByModerator}>
          End task
        </button>
      </>
    );
  }
  const done = new Set(session.tasks.filter((t) => t.completed).map((t) => t.task));
  return (
    <>
      <span className="text-caption max-w-16 truncate font-semibold" title={session.participant}>
        {session.participant}
      </span>
      {TASK_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={btn}
          aria-label={`Start ${id}: ${TASK_INFO[id].short}${done.has(id) ? " (done)" : ""}`}
          onClick={() => startTask(id)}
        >
          {done.has(id) ? `${id}✓` : id}
        </button>
      ))}
      <button
        type="button"
        className={btn}
        onClick={() => {
          const restore = endSession();
          setTestFlags({
            hidePill: !!restore?.hidePill,
            hideTour: !!restore?.hideTour,
            treatAsThursday: !!restore?.treatAsThursday,
          });
        }}
      >
        End
      </button>
    </>
  );
}

export function TestOverlay({ aboveTabBar }: { aboveTabBar: boolean }) {
  const flags = useTestFlags();
  const state = useLadle();
  const sessions = useSessions();
  const session = currentSession(sessions);
  if (!flags.showTimer && !flags.showNextTask && !session) return null;
  const task = state && flags.showNextTask && !session ? nextTask(state.data) : null;
  const position = flags.overlayTop
    ? { top: "calc(var(--safe-top) + 54px)" }
    : {
        bottom: aboveTabBar ? "calc(var(--safe-bottom) + 96px)" : "calc(var(--safe-bottom) + 12px)",
      };

  return (
    <div
      role="region"
      aria-label="Test tools"
      data-test-overlay=""
      className="pointer-events-auto absolute left-2 z-50 flex max-w-[calc(100%-16px)] flex-wrap items-center gap-1.5 rounded-[22px] bg-ink py-1 pr-1 pl-3 text-bg shadow-float"
      style={position}
    >
      {session ? (
        <SessionBar session={session} />
      ) : (
        <>
          {flags.showNextTask && state && (
            <span className="text-caption truncate font-semibold" aria-live="polite">
              {task ? `Next: ${task.id} · ${task.short}` : "All 5 tasks done ✓"}
            </span>
          )}
          {flags.showTimer && <Stopwatch />}
        </>
      )}
      <button
        type="button"
        aria-label={
          flags.overlayTop ? "Move test tools to the bottom" : "Move test tools to the top"
        }
        onClick={() => setTestFlags({ overlayTop: !flags.overlayTop })}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
      >
        <span aria-hidden="true">↕</span>
      </button>
    </div>
  );
}
