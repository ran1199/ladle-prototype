"use client";

// Three small dots plus a label, shown next to every calorie number.
// Tapping it opens a sheet explaining, in one sentence, where the number came from.

import { useState } from "react";
import { CONFIRMATIONS_NEEDED } from "@/lib/logic";
import type { Confidence, Recipe } from "@/lib/types";
import { Sheet } from "./Sheet";
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
    meaning: `From a recipe; the portion isn’t confirmed ${CONFIRMATIONS_NEEDED} times yet.`,
  },
  confirmed: {
    filled: 3,
    label: "Your recipe ✓",
    dot: "bg-confirmed",
    text: "text-confirmed",
    meaning: `From your recipe, with ${CONFIRMATIONS_NEEDED} or more confirmed logs.`,
  },
};

const AI_NOTE = "Ingredient values are AI estimates based on standard nutrition data.";

function explanation(level: Confidence, recipe?: Recipe | null, pending = false): string {
  if (level === "rough" || !recipe) {
    return "Estimated from your photo alone, without a recipe, so hidden oil and sauce may be missed.";
  }
  const servings = `${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}`;
  if (level === "confirmed") {
    return `From your recipe ‘${recipe.name}’ (${servings}) × the portion you confirmed. ${AI_NOTE}`;
  }
  if (pending) {
    return `From your recipe ‘${recipe.name}’ (${servings}) × your portion. You’ve changed it the same way more than once, so Ladle is asking whether to update the recipe. ${AI_NOTE}`;
  }
  const left = Math.max(0, CONFIRMATIONS_NEEDED - recipe.confirmedLogs);
  return `From your recipe ‘${recipe.name}’ (${servings}) × your portion. Log it ${left} more ${left === 1 ? "time" : "times"} to make it ‘Your recipe ✓’. ${AI_NOTE}`;
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
  const l = LEVELS[level];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${l.label}. What does this mean?`}
        className={`text-caption -mx-1 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-1 font-medium ${l.text} hover:bg-surface-2 ${className}`}
      >
        <Dots level={level} />
        {l.label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={l.label}>
        <p className="text-body">{explanation(level, recipe, pending)}</p>
        <ul className="mt-5 space-y-3 rounded-[var(--radius-control)] bg-surface-2 p-4">
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
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </Sheet>
    </>
  );
}
