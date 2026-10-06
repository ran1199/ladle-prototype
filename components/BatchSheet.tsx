"use client";

// "Cook as a batch" (F9): how many servings did the pot make? Defaults to the
// recipe's servings. Ladle then counts down the leftovers as you log them.

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { recipeTotalKcal } from "@/lib/seed";
import type { Recipe } from "@/lib/types";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

const MAX_SERVINGS = 24;

export function BatchSheet({
  open,
  onClose,
  recipe,
  hasActiveBatch,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  recipe: Recipe;
  hasActiveBatch: boolean;
  onStart: (servingsMade: number) => void;
}) {
  const [servings, setServings] = useState(recipe.servings);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setServings(recipe.servings);
  }
  const perServing = Math.round(recipeTotalKcal(recipe) / servings);
  const step =
    "text-title flex size-12 items-center justify-center rounded-[10px] bg-surface disabled:opacity-40";

  return (
    <Sheet open={open} onClose={onClose} title="Cook as a batch">
      <p className="text-body">How many servings did the pot make?</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-headline tabular">{formatNumber(perServing)} kcal per serving</p>
          <p className="text-caption text-ink-2">
            {servings === recipe.servings
              ? "As the recipe says"
              : `The recipe says ${recipe.servings}`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1">
          <button
            type="button"
            aria-label="Fewer servings"
            disabled={servings <= 1}
            onClick={() => setServings((s) => s - 1)}
            className={step}
          >
            −
          </button>
          <span className="text-headline tabular w-9 text-center" aria-live="polite">
            {servings}
          </span>
          <button
            type="button"
            aria-label="More servings"
            disabled={servings >= MAX_SERVINGS}
            onClick={() => setServings((s) => s + 1)}
            className={step}
          >
            +
          </button>
        </div>
      </div>
      <p className="text-caption mt-4 text-ink-2">
        Ladle counts down the leftovers each time you log one, and reminds you on Today for 4 days.
        {hasActiveBatch ? " This replaces the batch you already have." : ""}
      </p>
      <Button className="mt-5 w-full" onClick={() => onStart(servings)}>
        Start batch · {servings} {servings === 1 ? "serving" : "servings"}
      </Button>
    </Sheet>
  );
}
