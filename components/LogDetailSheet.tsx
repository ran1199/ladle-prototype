"use client";

// Opens when a meal on Today is tapped: change the portion or time, or delete the log.
// Quick fixes ("more oil today") arrive in Milestone 5.

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { formatPortion, kcalFor } from "@/lib/logic";
import { actions } from "@/lib/store";
import type { LogEntry, Recipe } from "@/lib/types";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { DishIllustration } from "./DishIllustration";
import { PortionPicker } from "./PortionPicker";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { Button } from "./ui";

function toTimeValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function withTime(iso: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(iso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function LogDetailSheet({
  log,
  recipe,
  onClose,
}: {
  log: LogEntry | null;
  recipe: Recipe | null;
  onClose: () => void;
}) {
  const toast = useToast();
  // Keep showing the last log while the sheet slides closed.
  const [shown, setShown] = useState<LogEntry | null>(log);
  const [portion, setPortion] = useState(log?.portion ?? 1);
  const [time, setTime] = useState(log ? toTimeValue(log.at) : "12:00");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [prevId, setPrevId] = useState(log?.id);
  if (log && log.id !== prevId) {
    setPrevId(log.id);
    setShown(log);
    setPortion(log.portion);
    setTime(toTimeValue(log.at));
    setConfirmDelete(false);
  }

  const current = log ?? shown;
  if (!current) return null;

  const kcalPerServing = recipe ? kcalFor(recipe, 1) : current.kcal / current.portion;
  const kcal = Math.round(kcalPerServing * portion);
  const changed = portion !== current.portion || time !== toTimeValue(current.at);

  function save() {
    if (!current) return;
    actions.updateLog(current.id, { portion, at: withTime(current.at, time) });
    toast({ message: `Changed · ${formatNumber(kcal)} kcal` });
    onClose();
  }

  function remove() {
    if (!current) return;
    actions.deleteLog(current.id);
    toast({ message: `${current.name} removed from today` });
    onClose();
  }

  return (
    <Sheet open={log !== null} onClose={onClose} title={current.name}>
      <div className="-mt-1 mb-5 flex items-center gap-3">
        {recipe && <DishIllustration kind={recipe.illustration} seed={recipe.id} size={48} />}
        <div>
          <p className="text-body tabular">
            {formatPortion(portion)} · {formatNumber(kcal)} kcal
          </p>
          <ConfidenceIndicator level={current.confidence} recipe={recipe} />
        </div>
      </div>

      <h3 className="text-headline mb-2">Portion</h3>
      <PortionPicker value={portion} onChange={setPortion} kcalPerServing={kcalPerServing} />
      {current.batchId && (
        <p className="text-caption mt-2 text-ink-2">From your batch. Leftovers update to match.</p>
      )}

      <label className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-control)] bg-surface-2 px-4">
        <span className="text-headline">Time</span>
        <input
          type="time"
          value={time}
          onChange={(e) => e.target.value && setTime(e.target.value)}
          className="text-body tabular min-h-11 bg-transparent text-right"
        />
      </label>

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={save} disabled={!changed}>
          Save changes
        </Button>
        {!confirmDelete ? (
          <Button variant="quiet" onClick={() => setConfirmDelete(true)}>
            Delete this log
          </Button>
        ) : (
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-4">
            <p className="text-body">Remove {current.name} from today?</p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={remove}>
                Remove
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDelete(false)}
              >
                Keep it
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
