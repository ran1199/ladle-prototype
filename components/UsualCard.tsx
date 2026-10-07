"use client";

// "Your usual" on Today (replaces the old quick-action tiles): the most likely
// meal for now, e.g. "Thursday dinner · Your usual chicken adobo?", with a
// one-tap "Log · 420" (a quick log: it doesn't count towards "Your recipe ✓").
// "Not today" shows the next likely meal, up to three, then "See all recipes".
// Below it, a smaller "Add other food" row.

import Link from "next/link";
import { useState } from "react";
import { kcalNumber } from "@/lib/format";
import { formatPortion, logKcal, activeBatch, recipeConfidence } from "@/lib/logic";
import { actions } from "@/lib/store";
import { useTestFlags } from "@/lib/testControls";
import type { AppData } from "@/lib/types";
import { usualSuggestions } from "@/lib/usual";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { RecipeThumb } from "./RecipeThumb";
import { BasketIcon, ChevronIcon } from "./icons";
import { LogButton } from "./LogButton";
import { useToast } from "./Toast";
import { Button, ButtonLink, Card } from "./ui";

function AddOtherFood() {
  return (
    <Link
      href="/add-food"
      className="flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-4 py-2 hover:bg-surface"
    >
      <BasketIcon className="shrink-0 text-accent-strong" width={22} height={22} />
      <span className="min-w-0 flex-1">
        <span className="text-headline">Add other food</span>
        <span className="text-caption text-ink-2"> · barcode, search or restaurant</span>
      </span>
      <ChevronIcon aria-hidden="true" className="shrink-0 text-ink-2" />
    </Link>
  );
}

export function UsualCard({ data }: { data: AppData }) {
  const toast = useToast();
  const flags = useTestFlags();
  const [skipped, setSkipped] = useState(0);
  const now = new Date();
  const result = usualSuggestions(data, now, flags.treatAsThursday ? 4 : undefined);

  // The suggestions move on when the meal changes (e.g. lunch is logged): start again.
  const key = result ? `${result.slot}:${result.suggestions.map((s) => s.recipe.id).join()}` : "";
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setSkipped(0);
  }

  if (data.recipes.length === 0) {
    return (
      <div className="space-y-1">
        <Card>
          <p className="text-headline">Add your first recipe</p>
          <p className="text-body mt-1 text-ink-2">
            Import a recipe once, from a link, a caption or a photo. Then logging it takes a tap.
          </p>
          <ButtonLink href="/recipes" className="mt-4 w-full">
            Go to Recipes
          </ButtonLink>
        </Card>
        <AddOtherFood />
      </div>
    );
  }

  // Dinner is logged (or it's the middle of the night): no suggestion.
  if (!result) return <AddOtherFood />;

  const day = flags.treatAsThursday
    ? "Thursday"
    : now.toLocaleDateString("en-US", { weekday: "long" });
  const suggestion = result.suggestions[skipped];

  if (!suggestion) {
    return (
      <div className="space-y-1">
        <Card className="flex items-center gap-3">
          <p className="text-body min-w-0 flex-1 text-ink-2">Something else today?</p>
          <ButtonLink href="/recipes" variant="secondary" className="shrink-0 px-4">
            See all recipes
          </ButtonLink>
        </Card>
        <AddOtherFood />
      </div>
    );
  }

  const { recipe } = suggestion;
  const level = recipeConfidence(recipe, data.fixes);
  const portion = recipe.usualPortion;
  const kcal = logKcal(recipe, portion, activeBatch(data, recipe.id, now));
  const name = recipe.name.charAt(0).toLowerCase() + recipe.name.slice(1);

  function log() {
    const entry = actions.logRecipe(recipe.id, portion, {
      via: "suggestion",
      suggestedPortion: portion,
      acceptedEstimate: true,
    });
    if (!entry) return;
    toast({
      message: `${recipe.name} logged · ${kcalNumber(entry.kcal, entry.confidence)} kcal`,
      actionLabel: "Undo",
      onAction: () => actions.deleteLog(entry.id),
    });
  }

  return (
    <div className="space-y-1">
      <Card>
        <section aria-labelledby="usual-heading">
          <p className="text-caption font-semibold tracking-wide text-ink-2 uppercase">
            {day} {result.slot}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <RecipeThumb recipe={recipe} size={56} />
            <div className="min-w-0 flex-1">
              <h2 id="usual-heading" className="text-headline">
                {suggestion.usual ? `Your usual ${name}?` : `${recipe.name}?`}
              </h2>
              <p className="text-caption tabular text-ink-2">{formatPortion(portion)}</p>
              <ConfidenceIndicator level={level} recipe={recipe} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <LogButton
              onClick={log}
              name={recipe.name}
              portion={portion}
              kcal={kcal}
              level={level}
            />
            <Button
              variant="secondary"
              onClick={() => setSkipped(skipped + 1)}
              aria-label={`Not today. Show another suggestion instead of ${recipe.name}`}
            >
              Not today
            </Button>
          </div>
        </section>
      </Card>
      <AddOtherFood />
    </div>
  );
}
