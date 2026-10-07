"use client";

// Leftover cards (F9), shared by Today and Pantry:
// - a fresh batch: "Turkey chili, 4 servings left. Log one?" with a one-tap Log;
// - an older batch (over 4 days): "Still have turkey chili?" Yes / Clear.

import Link from "next/link";
import { formatNumber, isSameDay } from "@/lib/format";
import { logKcal } from "@/lib/logic";
import { actions } from "@/lib/store";
import type { Batch, Recipe } from "@/lib/types";
import { DishIllustration } from "./DishIllustration";
import { useToast } from "./Toast";
import { Button, Card } from "./ui";

/** "today", "yesterday", "3 days ago" */
export function cookedWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (isSameDay(d, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "yesterday";
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return `${Math.round((start(now) - start(d)) / 86_400_000)} days ago`;
}

function servingsText(n: number) {
  return `${n} ${n === 1 ? "serving" : "servings"}`;
}

export function useLogFromBatch() {
  const toast = useToast();
  return (batch: Batch, recipe: Recipe, via: "leftovers" | "pantry") => {
    const log = actions.logRecipe(recipe.id, 1, { batchId: batch.id, via });
    if (!log) return;
    toast({
      message: `${recipe.name} logged · ${formatNumber(log.kcal)} kcal`,
      actionLabel: "Undo",
      onAction: () => actions.deleteLog(log.id),
    });
  };
}

/** Today's nudge for a fresh batch. */
export function LeftoverNudge({ batch, recipe }: { batch: Batch; recipe: Recipe }) {
  const logFromBatch = useLogFromBatch();
  return (
    <Card className="flex items-center gap-3">
      <DishIllustration kind={recipe.illustration} seed={recipe.id} size={48} />
      <div className="min-w-0 flex-1">
        <p className="text-headline">{recipe.name}</p>
        <p className="text-body tabular text-ink-2">
          {servingsText(batch.servingsLeft)} left. Log one?
        </p>
      </div>
      <Button
        className="shrink-0 px-4"
        onClick={() => logFromBatch(batch, recipe, "leftovers")}
        aria-label={`Log one serving of ${recipe.name}, ${formatNumber(logKcal(recipe, 1, batch))} kcal`}
      >
        Log
      </Button>
    </Card>
  );
}

/** "Still have turkey chili?" for a batch older than 4 days. */
export function StillHaveCard({ batch, recipe }: { batch: Batch; recipe: Recipe }) {
  const toast = useToast();
  return (
    <Card className="border-2 border-estimate">
      <div className="flex items-center gap-3">
        <DishIllustration kind={recipe.illustration} seed={recipe.id} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-headline">Still have {recipe.name.toLowerCase()}?</p>
          <p className="text-body tabular text-ink-2">
            {servingsText(batch.servingsLeft)} left from {cookedWhen(batch.cookedAt)}.
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            actions.updateBatch(batch.id, { checkedAt: new Date().toISOString() });
            toast({ message: "Kept. Ladle will remind you for 4 more days." });
          }}
        >
          Yes
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const left = batch.servingsLeft;
            actions.updateBatch(batch.id, { servingsLeft: 0 });
            toast({
              message: `Cleared ${recipe.name.toLowerCase()}.`,
              actionLabel: "Undo",
              onAction: () => actions.updateBatch(batch.id, { servingsLeft: left }),
            });
          }}
        >
          Clear
        </Button>
      </div>
    </Card>
  );
}

/** Pantry's card for a fresh batch: countdown, Log a serving, and fixing the count. */
export function BatchCard({ batch, recipe }: { batch: Batch; recipe: Recipe }) {
  const logFromBatch = useLogFromBatch();
  const share = batch.servingsLeft / batch.servingsMade;
  const step =
    "text-headline flex size-11 items-center justify-center rounded-[10px] bg-surface-2 disabled:opacity-40";
  return (
    <Card>
      <div className="flex items-center gap-3">
        <DishIllustration kind={recipe.illustration} seed={recipe.id} size={48} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-headline underline-offset-4 hover:underline"
          >
            {recipe.name}
          </Link>
          <p className="text-caption text-ink-2">Cooked {cookedWhen(batch.cookedAt)}</p>
        </div>
      </div>
      <p className="text-body tabular mt-3">
        <strong>{batch.servingsLeft}</strong> of {batch.servingsMade} servings left
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label={`${recipe.name} servings left`}
        aria-valuemin={0}
        aria-valuemax={batch.servingsMade}
        aria-valuenow={batch.servingsLeft}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button className="flex-1" onClick={() => logFromBatch(batch, recipe, "pantry")}>
          Log one · {formatNumber(logKcal(recipe, 1, batch))} kcal
        </Button>
        <div className="flex items-center gap-1" role="group" aria-label="Fix the count">
          <button
            type="button"
            aria-label="One fewer serving left"
            className={step}
            onClick={() => actions.updateBatch(batch.id, { servingsLeft: batch.servingsLeft - 1 })}
          >
            −
          </button>
          <button
            type="button"
            aria-label="One more serving left"
            disabled={batch.servingsLeft >= batch.servingsMade}
            className={step}
            onClick={() => actions.updateBatch(batch.id, { servingsLeft: batch.servingsLeft + 1 })}
          >
            +
          </button>
        </div>
      </div>
    </Card>
  );
}
