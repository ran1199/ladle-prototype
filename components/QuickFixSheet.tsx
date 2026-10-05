"use client";

// "Today was different?" (F7; task T3). Pick what changed, see the calorie
// effect, then choose "Just this time" (this log only) or "Always" (update the
// saved recipe). If the same "Just this time" fix has now been made twice,
// Ladle asks: "You usually add more oil to this. Update your recipe?"

import { useId, useState } from "react";
import { FIX_KINDS, fixOptions, type FixOption, type Suggestion } from "@/lib/fixes";
import { formatNumber } from "@/lib/format";
import type { FixKind, Recipe } from "@/lib/types";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

type Step =
  | { name: "choose" }
  | { name: "options"; kind: FixKind }
  | { name: "suggest"; suggestion: Suggestion; message: string };

function signed(n: number) {
  return `${n >= 0 ? "+" : "−"}${formatNumber(Math.abs(n))}`;
}

export function QuickFixSheet({
  open,
  onClose,
  recipe,
  portion,
  baseKcal,
  initialKind,
  onApply,
  onResolve,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  portion: number;
  /** This plate's calories before the fix. */
  baseKcal: number;
  /** Open straight on one kind (e.g. a "More oil" chip was tapped). */
  initialKind?: FixKind;
  /** Performs the fix; returns a suggestion if one should be offered next. */
  onApply: (option: FixOption, scope: "once" | "always") => Suggestion | null;
  /** The answer to the suggestion. */
  onResolve: (suggestion: Suggestion, accept: boolean) => void;
  /** Finished: the parent closes the sheet and shows this message. */
  onDone: (message: string) => void;
}) {
  const start: Step = initialKind ? { name: "options", kind: initialKind } : { name: "choose" };
  const [step, setStep] = useState<Step>(start);
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [freeTextNote, setFreeTextNote] = useState(false);
  const freeTextId = useId();

  // Start fresh each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(start);
      setSelected(null);
      setFreeText("");
      setFreeTextNote(false);
    }
  }

  const kinds = recipe ? FIX_KINDS : FIX_KINDS.filter((k) => k.kind === "other");
  const options = step.name === "options" ? fixOptions(step.kind, recipe, portion, baseKcal) : [];
  const option = options.find((o) => o.detail === selected) ?? options[0] ?? null;
  const kindLabel =
    step.name === "options" ? FIX_KINDS.find((k) => k.kind === step.kind)?.label : undefined;

  function apply(scope: "once" | "always") {
    if (!option) return;
    const message = scope === "always" ? "Ladle will remember that." : "Changed for today.";
    const suggestion = onApply(option, scope);
    if (suggestion) setStep({ name: "suggest", suggestion, message });
    else onDone(message);
  }

  const chip = (active: boolean) =>
    `text-body tabular min-h-12 rounded-[var(--radius-control)] px-3 text-left font-medium transition-colors duration-200 ${
      active ? "bg-ink text-bg" : "bg-surface-2 text-ink hover:brightness-[0.97]"
    }`;

  const title =
    step.name === "suggest"
      ? step.message
      : step.name === "options"
        ? (kindLabel ?? "")
        : "Today was different?";

  return (
    <Sheet open={open} onClose={onClose} title={title}>
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
          {!initialKind && (
            <button
              type="button"
              onClick={() => setStep({ name: "choose" })}
              className="text-headline -mt-2 mb-2 min-h-10 text-accent-strong"
            >
              ‹ Other changes
            </button>
          )}

          {step.kind === "other" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (freeText.trim()) setFreeTextNote(true);
              }}
              className="mb-3"
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
                    setFreeTextNote(false);
                  }}
                  placeholder="e.g. added cheese on top"
                  className="text-body min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2"
                />
                <Button type="submit" variant="secondary" className="shrink-0 px-4">
                  Estimate
                </Button>
              </div>
              {freeTextNote && (
                <p role="alert" className="text-caption mt-2 text-ink-2">
                  Live AI estimates your own description. In Demo mode, pick an example below.
                </p>
              )}
              <p className="text-caption mt-3 font-semibold text-ink-2">Examples</p>
            </form>
          )}

          {options.length === 0 ? (
            <p className="text-body text-ink-2">
              {step.kind === "swapped"
                ? "Ladle needs Live AI to work out swaps for this recipe. Try “Something else” instead."
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
              <p className="text-body tabular mt-4">
                On your plate: <strong>{signed(option.plateDelta)} kcal</strong>
                <span className="text-ink-2">
                  {" "}
                  ({formatNumber(baseKcal)} → {formatNumber(baseKcal + option.plateDelta)})
                </span>
              </p>
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
                  onDone("Recipe updated. Ladle will remember that.");
                }}
              >
                Update recipe
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  onResolve(step.suggestion, false);
                  onDone(step.message);
                }}
              >
                Not now
              </Button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
