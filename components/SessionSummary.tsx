"use client";

// A usability session's results: one row per task with time, taps, wrong turns
// and ✓/✗ against the task's target, the details recorded, and a note box for
// the moderator. "Save as CSV" downloads it for a spreadsheet.

import { formatTime } from "@/lib/format";
import {
  csvName,
  downloadCSV,
  durationSeconds,
  setTaskNote,
  targetMet,
  TASK_INFO,
  type Session,
} from "@/lib/sessions";
import { Button } from "./ui";

function duration(s: number | null): string {
  if (s === null) return "–";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}:${String(sec).padStart(2, "0")}` : `${s.toFixed(1)} s`;
}

export function SessionSummary({ session }: { session: Session }) {
  const met = session.tasks.filter(targetMet).length;
  return (
    <div>
      <p className="text-body text-ink-2">
        {session.participant} ·{" "}
        {new Date(session.startedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}{" "}
        {formatTime(session.startedAt)}
        {session.tasks.length > 0 && ` · ${met} of ${session.tasks.length} targets met`}
      </p>

      {session.tasks.length === 0 ? (
        <p className="text-body mt-4">No tasks were run in this session.</p>
      ) : (
        <table className="text-caption tabular mt-3 w-full border-collapse text-left">
          <caption className="sr-only">Task results</caption>
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th scope="col" className="py-2 pr-2 font-semibold">
                Task
              </th>
              <th scope="col" className="py-2 pr-2 font-semibold">
                Time
              </th>
              <th scope="col" className="py-2 pr-2 font-semibold">
                Taps
              </th>
              <th scope="col" className="py-2 pr-2 font-semibold">
                Wrong turns
              </th>
              <th scope="col" className="py-2 font-semibold">
                Target
              </th>
            </tr>
          </thead>
          {session.tasks.map((t, i) => {
            const ok = targetMet(t);
            return (
              <tbody key={`${t.task}-${t.startedAt}`} className="border-b border-line">
                <tr>
                  <th scope="row" className="text-headline pt-3 pr-2 align-top">
                    {t.task}
                  </th>
                  <td className="pt-3 pr-2 align-top">{duration(durationSeconds(t))}</td>
                  <td className="pt-3 pr-2 align-top">{t.taps}</td>
                  <td className="pt-3 pr-2 align-top">{t.wrongTurns}</td>
                  <td className="pt-3 align-top">
                    <span className={`font-semibold ${ok ? "text-confirmed" : "text-ink"}`}>
                      {ok ? "✓ Met" : "✗ Not met"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="pt-1 pb-3">
                    <p className="text-ink-2">
                      {TASK_INFO[t.task].short}. Target: {TASK_INFO[t.task].target.toLowerCase()}.
                    </p>
                    <p className="mt-0.5">
                      {t.completed
                        ? "Completed"
                        : t.endedByModerator
                          ? "Ended by moderator"
                          : "Not finished"}
                      {` · ${t.edits} ${t.edits === 1 ? "edit" : "edits"}`}
                      {t.acceptedEstimate !== null &&
                        ` · estimate ${t.acceptedEstimate ? "accepted" : "changed"}`}
                      {t.choiceDetails && ` · ${t.choiceDetails}`}
                    </p>
                    <label className="mt-2 block">
                      <span className="sr-only">Moderator note for {t.task}</span>
                      <textarea
                        value={t.note}
                        onChange={(e) => setTaskNote(session.id, i, e.target.value)}
                        rows={2}
                        placeholder={`Note for ${t.task}`}
                        className="text-body w-full rounded-[var(--radius-control)] bg-surface-2 p-3 placeholder:text-ink-2"
                      />
                    </label>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
      )}

      <Button
        className="mt-4 w-full"
        disabled={session.tasks.length === 0}
        onClick={() => downloadCSV([session], csvName(session))}
      >
        Save as CSV
      </Button>
    </div>
  );
}
