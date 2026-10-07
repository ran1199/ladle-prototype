"use client";

// Opens when a meal on Today is tapped: quick fixes ("Today was different?"),
// change the portion or time, or delete the log. One sheet at a time: the quick
// fix is a step inside this sheet (with ‹ Back), and its confirmation shows
// here too before the sheet closes.

import { useState } from "react";
import { FIX_KINDS } from "@/lib/fixes";
import { formatNumber as fmt, kcalNumber } from "@/lib/format";
import { exactKcalPerServing, formatPortion } from "@/lib/logic";
import { emitEvent } from "@/lib/events";
import { actions } from "@/lib/store";
import type { FixKind, LogEntry, Recipe } from "@/lib/types";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { RecipeThumb } from "./RecipeThumb";
import { PortionPicker } from "./PortionPicker";
import { fixStepTitle, QuickFixSteps, type FixStep } from "./QuickFixSheet";
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
  highlightFix = false,
}: {
  log: LogEntry | null;
  recipe: Recipe | null;
  onClose: () => void;
  /** Opened from the 60-second tour: "Today was different?" is outlined. */
  highlightFix?: boolean;
}) {
  const toast = useToast();
  // Keep showing the last log while the sheet slides closed.
  const [shown, setShown] = useState<LogEntry | null>(log);
  const [portion, setPortion] = useState(log?.portion ?? 1);
  const [time, setTime] = useState(log ? toTimeValue(log.at) : "12:00");
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** "detail", or a quick-fix step inside this sheet. */
  const [step, setStep] = useState<"detail" | FixStep>("detail");

  // A different meal (or the same one opened again): start on the details.
  const [prevId, setPrevId] = useState(log?.id);
  if ((log?.id ?? undefined) !== prevId) {
    setPrevId(log?.id);
    if (log) {
      setShown(log);
      setPortion(log.portion);
      setTime(toTimeValue(log.at));
      setConfirmDelete(false);
      setStep("detail");
    }
  }

  const current = log ?? shown;
  if (!current) return null;

  const adjustments = current.adjustments ?? [];
  const adjustmentKcal = adjustments.reduce((t, a) => t + a.kcalDelta, 0);
  const kcalPerServing = recipe
    ? exactKcalPerServing(recipe)
    : (current.kcal - adjustmentKcal) / current.portion;
  const kcal = Math.round(kcalPerServing * portion) + adjustmentKcal;
  const kinds = recipe ? FIX_KINDS : FIX_KINDS.filter((k) => k.kind === "other");
  const changed = portion !== current.portion || time !== toTimeValue(current.at);

  function save() {
    if (!current) return;
    actions.updateLog(current.id, { portion, at: withTime(current.at, time) });
    emitEvent({ type: "edit", what: "log" });
    toast({ message: `Changed · ${kcalNumber(kcal, current.confidence)} kcal` });
    onClose();
  }

  const fixKindOf = (k: FixKind): FixStep => ({ name: "options", kind: k });

  function remove() {
    if (!current) return;
    actions.deleteLog(current.id);
    toast({ message: `${current.name} removed from today` });
    onClose();
  }

  if (step !== "detail") {
    return (
      <Sheet open={log !== null} onClose={onClose} title={fixStepTitle(step)}>
        <QuickFixSteps
          key={step.name === "options" ? step.kind : step.name}
          recipe={recipe}
          portion={current.portion}
          baseKcal={current.kcal}
          step={step}
          onStep={setStep}
          onBack={() => setStep("detail")}
          onApply={(option, scope) => actions.applyFix({ option, scope, logId: current.id })}
          onResolve={(suggestion, accept) => {
            if (recipe) actions.resolveSuggestion(recipe.id, suggestion, accept);
          }}
          onDone={onClose}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open={log !== null} onClose={onClose} title={current.name}>
      <div className="step-in">
        <div className="-mt-1 mb-5 flex items-center gap-3">
          {recipe && <RecipeThumb recipe={recipe} size={48} />}
          <div>
            <p className="text-body tabular">
              {formatPortion(portion)} · {kcalNumber(kcal, current.confidence)} kcal
            </p>
            <ConfidenceIndicator level={current.confidence} recipe={recipe} />
          </div>
        </div>

        <section
          aria-labelledby="fix-heading"
          className={`mb-5 ${highlightFix ? "-mx-3 rounded-[var(--radius-control)] p-3 ring-2 ring-accent" : ""}`}
        >
          <h3 id="fix-heading" className="text-headline mb-2">
            Today was different?
          </h3>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setStep(fixKindOf(k.kind))}
                className="min-h-11 rounded-full bg-surface-2 px-3.5 text-[15px] font-medium hover:brightness-[0.97]"
              >
                {k.label}
              </button>
            ))}
          </div>
          {adjustments.length > 0 && (
            <ul className="text-caption tabular mt-3 space-y-1 text-ink-2">
              {adjustments.map((a) => (
                <li key={a.fixId}>
                  Just this time: {a.label} · {a.kcalDelta >= 0 ? "+" : "−"}
                  {fmt(Math.abs(a.kcalDelta))} kcal
                </li>
              ))}
            </ul>
          )}
        </section>

        <h3 className="text-headline mb-2">Portion</h3>
        <PortionPicker
          value={portion}
          onChange={setPortion}
          kcalPerServing={kcalPerServing}
          level={current.confidence}
        />
        {current.batchId && (
          <p className="text-caption mt-2 text-ink-2">
            From your batch. Leftovers update to match.
          </p>
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
      </div>
    </Sheet>
  );
}
