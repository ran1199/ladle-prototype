"use client";

// "Today was different?" (F7; task T3). Pick what changed, see the calorie
// effect, then choose "Just this time" (this log only) or "Always" (update the
// saved recipe). If the same "Just this time" fix has now been made twice,
// Ladle asks: "You usually add more oil to this. Update your recipe?" Then a
// short confirmation, in the same place.
//
// One sheet at a time: `QuickFixSteps` is the content, used as a step inside
// the meal's sheet (LogDetailSheet); `QuickFixSheet` wraps it in its own sheet
// for the camera result, which isn't a sheet.

import { useEffect, useId, useRef, useState } from "react";
import { loadAI } from "@/lib/ai/lazy";
import { customOption, FIX_KINDS, fixOptions, type FixOption, type Suggestion } from "@/lib/fixes";
import { formatNumber } from "@/lib/format";
import type { FixKind, Recipe } from "@/lib/types";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

export type FixStep =
  | { name: "choose" }
  | { name: "options"; kind: FixKind }
  | { name: "suggest"; suggestion: Suggestion; message: string }
  | { name: "done"; message: string };

/** How long the confirmation shows before the sheet closes. */
const DONE_MS = 1400;

/** The title for each step (the sheet shows it). */
export function fixStepTitle(step: FixStep): string {
  if (step.name === "suggest") return step.message;
  if (step.name === "done") return "Done";
  if (step.name === "options") return FIX_KINDS.find((k) => k.kind === step.kind)?.label ?? "";
  return "Today was different?";
}

function signed(n: number) {
  return `${n >= 0 ? "+" : "−"}${formatNumber(Math.abs(n))}`;
}

type StepsProps = {
  recipe: Recipe | null;
  portion: number;
  /** This plate's calories before the fix. */
  baseKcal: number;
  step: FixStep;
  onStep: (step: FixStep) => void;
  /** "‹ Back" on the options step (to the kinds, or to the meal). Hidden if missing. */
  onBack?: () => void;
  /** Performs the fix; returns a suggestion if one should be offered next. */
  onApply: (option: FixOption, scope: "once" | "always") => Suggestion | null;
  /** The answer to the suggestion. */
  onResolve: (suggestion: Suggestion, accept: boolean) => void;
  /** Finished (after the confirmation): the parent closes the sheet. */
  onDone: (message: string) => void;
};

/** The quick-fix steps, without a sheet around them. */
export function QuickFixSteps({
  recipe,
  portion,
  baseKcal,
  step,
  onStep: setStep,
  onBack,
  onApply,
  onResolve,
  onDone,
}: StepsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [estimating, setEstimating] = useState(false);
  /** The typed change, worked out by the AI (or calories the user typed). */
  const [custom, setCustom] = useState<FixOption | null>(null);
  /** The AI couldn't work the text out: ask for calories instead. */
  const [unknown, setUnknown] = useState(false);
  const [manualKcal, setManualKcal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const freeTextId = useId();
  const manualId = useId();

  const kinds = recipe ? FIX_KINDS : FIX_KINDS.filter((k) => k.kind === "other");
  const options =
    step.name === "options"
      ? [
          ...(step.kind === "other" && custom ? [custom] : []),
          ...fixOptions(step.kind, recipe, portion, baseKcal),
        ]
      : [];
  const option = options.find((o) => o.detail === selected) ?? options[0] ?? null;
  const kindLabel = step.name === "options" ? fixStepTitle(step) : undefined;

  async function estimate() {
    const text = freeText.trim();
    if (!text) return;
    setEstimating(true);
    setError(null);
    setUnknown(false);
    try {
      const ai = await loadAI();
      const r = await ai.estimateCorrection({ recipe, text, portion });
      if (r.recognized === false) {
        setUnknown(true);
      } else {
        const option = customOption(recipe, portion, r.kcalDelta / portion, r.summary);
        setCustom(option);
        setSelected(option.detail);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ladle couldn’t work that out. Try again.");
    } finally {
      setEstimating(false);
    }
  }

  function applyManual() {
    const kcal = Number(manualKcal);
    if (!manualKcal.trim() || !Number.isFinite(kcal)) return;
    const option = customOption(
      recipe,
      portion,
      kcal / portion,
      freeText.trim() || "Something else",
    );
    setCustom(option);
    setSelected(option.detail);
    setUnknown(false);
  }

  function apply(scope: "once" | "always") {
    if (!option) return;
    const message = scope === "always" ? "Ladle will remember that." : "Changed for today.";
    const suggestion = onApply(option, scope);
    setStep(suggestion ? { name: "suggest", suggestion, message } : { name: "done", message });
  }

  // The confirmation shows briefly in the same sheet, then the sheet closes.
  const doneMessage = step.name === "done" ? step.message : null;
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    if (doneMessage === null) return;
    const t = setTimeout(() => onDoneRef.current(doneMessage), DONE_MS);
    return () => clearTimeout(t);
  }, [doneMessage]);

  const chip = (active: boolean) =>
    `text-body tabular min-h-12 rounded-[var(--radius-control)] px-3 text-left font-medium transition-colors duration-200 ${
      active ? "bg-ink text-bg" : "bg-surface-2 text-ink hover:brightness-[0.97]"
    }`;

  return (
    <div key={step.name} className="step-in">
      {step.name === "choose" && (
        <div className="grid grid-cols-2 gap-2">
          {kinds.map((k) => (
            <button
              key={k.kind}
              type="button"
              onClick={() => {
                setStep({ name: "options", kind: k.kind });
                setSelected(null);
              }}
              className="text-headline min-h-14 rounded-[var(--radius-control)] bg-surface-2 px-3 text-left hover:brightness-[0.97]"
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {step.name === "options" && (
        <>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-headline -mt-2 mb-2 min-h-11 text-accent-strong"
            >
              ‹ Back
            </button>
          )}

          {step.kind === "other" && (
            <div className="mb-3">
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void estimate();
                }}
              >
                <label htmlFor={freeTextId} className="text-caption font-semibold text-ink-2">
                  What was different?
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id={freeTextId}
                    value={freeText}
                    onChange={(e) => {
                      setFreeText(e.target.value);
                      setUnknown(false);
                      setError(null);
                    }}
                    placeholder="e.g. added 30g cheddar"
                    className="text-body min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="shrink-0 px-4"
                    disabled={!freeText.trim() || estimating}
                  >
                    {estimating ? "…" : "Estimate"}
                  </Button>
                </div>
              </form>
              {error && (
                <p role="alert" className="text-caption mt-2 text-ink-2">
                  {error}
                </p>
              )}
              {unknown && (
                <form
                  noValidate
                  className="mt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyManual();
                  }}
                >
                  <p role="alert" className="text-body">
                    I couldn&rsquo;t work that out. Enter the calories yourself?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <label htmlFor={manualId} className="sr-only">
                      Calories for this plate (use a minus sign for less)
                    </label>
                    <input
                      id={manualId}
                      inputMode="numeric"
                      value={manualKcal}
                      onChange={(e) => setManualKcal(e.target.value.replace(/[^\d-]/g, ""))}
                      placeholder="kcal, e.g. 120 or -50"
                      className="text-body tabular min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2"
                    />
                    <Button type="submit" variant="secondary" className="shrink-0 px-4">
                      Use
                    </Button>
                  </div>
                </form>
              )}
              <p className="text-caption mt-3 font-semibold text-ink-2">
                {custom ? "Your change, or an example" : "Examples"}
              </p>
            </div>
          )}

          {options.length === 0 ? (
            <p className="text-body text-ink-2">
              {step.kind === "swapped"
                ? "Ladle doesn’t know a swap for this recipe. Try “Something else” and describe it."
                : "There’s no oil in this recipe to use less of."}
            </p>
          ) : (
            <div role="group" aria-label={kindLabel} className="flex flex-col gap-2">
              {options.map((o) => (
                <button
                  key={o.detail}
                  type="button"
                  aria-pressed={option?.detail === o.detail}
                  onClick={() => setSelected(o.detail)}
                  className={chip(option?.detail === o.detail)}
                >
                  {o.chip}
                </button>
              ))}
            </div>
          )}

          {option && (
            <>
              <div
                className="mt-4 rounded-[var(--radius-control)] bg-surface-2 px-4 py-3"
                aria-live="polite"
              >
                <p className="text-title tabular">
                  On your plate: {signed(option.plateDelta)} kcal
                </p>
                <p className="text-caption tabular text-ink-2">
                  {formatNumber(baseKcal)} → {formatNumber(baseKcal + option.plateDelta)} kcal
                  {option.potDelta !== null && recipe && option.kind !== "other"
                    ? ` · your share of ${signed(option.potDelta)} for the batch`
                    : ""}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => apply("once")}
                  className="flex min-h-20 flex-col items-start justify-center rounded-[var(--radius-control)] bg-surface-2 px-4 py-3 text-left hover:brightness-[0.97]"
                >
                  <span className="text-headline">Just this time</span>
                  <span className="text-caption text-ink-2">Changes today&rsquo;s log only</span>
                </button>
                <button
                  type="button"
                  onClick={() => apply("always")}
                  disabled={!option.alwaysNote || !recipe}
                  className="flex min-h-20 flex-col items-start justify-center rounded-[var(--radius-control)] bg-accent-strong px-4 py-3 text-left text-on-accent hover:brightness-95 disabled:opacity-40"
                >
                  <span className="text-headline">Always</span>
                  <span className="text-caption opacity-90">
                    {recipe && option.alwaysNote
                      ? `Updates your recipe: ${option.alwaysNote}`
                      : "Only for saved recipes"}
                  </span>
                </button>
              </div>
            </>
          )}
        </>
      )}

      {step.name === "suggest" && (
        <>
          <div className="rounded-[var(--radius-card)] border-2 border-estimate p-4">
            <p className="text-headline">{step.suggestion.text}</p>
            <p className="text-caption mt-1 text-ink-2">
              Ladle never changes a recipe without asking.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  onResolve(step.suggestion, true);
                  setStep({ name: "done", message: "Recipe updated. Ladle will remember that." });
                }}
              >
                Update recipe
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  onResolve(step.suggestion, false);
                  setStep({ name: "done", message: step.message });
                }}
              >
                Not now
              </Button>
            </div>
          </div>
        </>
      )}
      {step.name === "done" && (
        <p role="status" className="text-body flex items-center gap-3 py-2">
          <span
            aria-hidden="true"
            className="text-headline flex size-9 shrink-0 items-center justify-center rounded-full bg-confirmed text-surface"
          >
            ✓
          </span>
          {step.message}
        </p>
      )}
    </div>
  );
}

/** The quick fix in its own sheet (for the camera result, which isn't a sheet). */
export function QuickFixSheet({
  open,
  onClose,
  ...props
}: Omit<StepsProps, "step" | "onStep" | "onBack"> & { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<FixStep>({ name: "choose" });
  // Start fresh each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStep({ name: "choose" });
  }
  return (
    <Sheet open={open} onClose={onClose} title={fixStepTitle(step)}>
      <QuickFixSteps
        {...props}
        step={step}
        onStep={setStep}
        onBack={() => setStep({ name: "choose" })}
      />
    </Sheet>
  );
}
