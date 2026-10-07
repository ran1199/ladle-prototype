"use client";

// Three small dots plus a label, shown next to every calorie number.
// Tapping it opens a sheet explaining, in one sentence, where the number came from.

import { useId, useState } from "react";
import { CONFIRMATIONS_NEEDED } from "@/lib/logic";
import type { Confidence, Recipe } from "@/lib/types";
import { Sheet, useInSheet } from "./Sheet";
import { Button } from "./ui";

const LEVELS: Record<
  Confidence,
  { filled: number; label: string; dot: string; text: string; meaning: string }
> = {
  rough: {
    filled: 1,
    label: "Rough estimate",
    dot: "bg-rough",
    text: "text-ink-2",
    meaning: "From a photo only, without a recipe.",
  },
  good: {
    filled: 2,
    label: "Good estimate",
    dot: "bg-estimate",
    text: "text-estimate-ink",
    meaning: `From your recipe, but your portion hasn’t been confirmed ${CONFIRMATIONS_NEEDED} times yet.`,
  },
  confirmed: {
    filled: 3,
    label: "Your recipe ✓",
    dot: "bg-confirmed",
    text: "text-confirmed",
    meaning: `You’ve confirmed your portion of this recipe at least ${CONFIRMATIONS_NEEDED} times, so this number is as good as your recipe.`,
  },
  label: {
    filled: 3,
    label: "From the label",
    dot: "bg-confirmed",
    text: "text-confirmed",
    meaning: "From the product’s nutrition label.",
  },
};

const AI_NOTE =
  "Ingredient values are estimates from standard nutrition data (approximate USDA values).";
const ROUNDED = "Estimates are shown rounded to the nearest 10.";

function explanation(level: Confidence, recipe?: Recipe | null, pending = false): string {
  if (level === "label") {
    return "From the product’s nutrition label (via Open Food Facts) × the servings you had. Label data always beats an estimate.";
  }
  if (level === "good" && !recipe) {
    return `From typical values for this food and serving size, not your own recipe or a label. ${ROUNDED}`;
  }
  if (level === "rough" || !recipe) {
    return `Estimated from your photo alone, without a recipe, so hidden oil and sauce may be missed. ${ROUNDED}`;
  }
  const servings = `${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}`;
  if (level === "confirmed") {
    return `From your recipe ‘${recipe.name}’ (${servings}) × your portion. You’ve confirmed your portion at least ${CONFIRMATIONS_NEEDED} times, so this number is as good as your recipe. ${AI_NOTE}`;
  }
  if (pending) {
    return `From your recipe ‘${recipe.name}’ (${servings}) × your portion. You’ve changed it the same way more than once, so Ladle is asking whether to update the recipe. ${AI_NOTE} ${ROUNDED}`;
  }
  const left = Math.max(0, CONFIRMATIONS_NEEDED - recipe.confirmedLogs);
  return `From your recipe ‘${recipe.name}’ (${servings}) × your portion, but your portion hasn’t been confirmed ${CONFIRMATIONS_NEEDED} times yet. Confirm it ${left} more ${left === 1 ? "time" : "times"} (log from a plate photo, or choose the portion) to make it ‘Your recipe ✓’. Quick one-tap logs don’t count. ${AI_NOTE} ${ROUNDED}`;
}

export function Dots({ level }: { level: Confidence }) {
  const l = LEVELS[level];
  return (
    <span aria-hidden="true" className="inline-flex gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`size-[7px] rounded-full ${i < l.filled ? l.dot : "border border-line"}`}
        />
      ))}
    </span>
  );
}

export function ConfidenceIndicator({
  level,
  recipe,
  pending = false,
  className = "",
}: {
  level: Confidence;
  recipe?: Recipe | null;
  /** The recipe has a repeated correction waiting for the user's decision. */
  pending?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Inside a sheet, the explanation opens below the label instead of a second sheet.
  const inSheet = useInSheet();
  const l = LEVELS[level];

  const legend = (
    <ul className="space-y-3 rounded-[var(--radius-control)] bg-surface-2 p-4">
      {(Object.keys(LEVELS) as Confidence[]).map((key) => (
        <li key={key} className="flex items-start gap-3">
          <span className="mt-[7px]">
            <Dots level={key} />
          </span>
          <span className="text-caption">
            <span className={`font-semibold ${LEVELS[key].text}`}>{LEVELS[key].label}</span>
            <span className="text-ink-2"> · {LEVELS[key].meaning}</span>
          </span>
        </li>
      ))}
    </ul>
  );

  const button = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={`${l.label}. What does this mean?`}
      {...(inSheet ? { "aria-expanded": open, "aria-controls": panelId } : {})}
      className={`text-caption -mx-1 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-1 font-medium ${l.text} hover:bg-surface-2 ${className}`}
    >
      <Dots level={level} />
      {l.label}
      {inSheet && (
        <span aria-hidden="true" className="text-ink-2">
          {open ? "▴" : "▾"}
        </span>
      )}
    </button>
  );

  if (inSheet) {
    return (
      <span className="block">
        {button}
        {open && (
          <span id={panelId} className="mt-2 block">
            <span className="text-body block">{explanation(level, recipe, pending)}</span>
            <span className="mt-3 block">{legend}</span>
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      {button}
      <Sheet open={open} onClose={() => setOpen(false)} title={l.label}>
        <p className="text-body">{explanation(level, recipe, pending)}</p>
        <div className="mt-5">{legend}</div>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </Sheet>
    </>
  );
}
