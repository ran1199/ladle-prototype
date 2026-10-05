"use client";

// Recipes tab (F6): search, recipes sorted by most recently eaten, one-tap Log
// with Undo, and a portion picker (long-press Log, or the "…" button).

import { useState } from "react";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { DishIllustration } from "@/components/DishIllustration";
import { MoreIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { PortionPicker } from "@/components/PortionPicker";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { useLongPress } from "@/components/useLongPress";
import { Button, Card, ScreenHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { formatPortion, kcalFor, recipeConfidence } from "@/lib/logic";
import { actions, useLadle } from "@/lib/store";
import type { Recipe } from "@/lib/types";

function RecipeCard({
  recipe,
  onLog,
  onPickPortion,
}: {
  recipe: Recipe;
  onLog: () => void;
  onPickPortion: () => void;
}) {
  const press = useLongPress(onPickPortion);
  const perServing = kcalFor(recipe, 1);
  return (
    <Card className="flex gap-3 p-4">
      <DishIllustration kind={recipe.illustration} seed={recipe.id} size={64} />
      <div className="min-w-0 flex-1">
        <h2 className="text-headline">{recipe.name}</h2>
        <p className="text-caption tabular mt-0.5 text-ink-2">
          {formatNumber(perServing)} kcal per serving · {recipe.servings}{" "}
          {recipe.servings === 1 ? "serving" : "servings"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3">
          {recipe.cuisine && (
            <span className="text-caption rounded-full bg-surface-2 px-2.5 py-0.5 text-ink-2">
              {recipe.cuisine}
            </span>
          )}
          <ConfidenceIndicator level={recipeConfidence(recipe)} recipe={recipe} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        <button
          type="button"
          onClick={onPickPortion}
          aria-label={`Choose a portion of ${recipe.name}`}
          className="-mt-1 -mr-1 flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"
        >
          <MoreIcon />
        </button>
        <Button
          className="min-h-11 px-4 select-none [-webkit-touch-callout:none]"
          aria-label={`Log ${formatPortion(recipe.usualPortion)} of ${recipe.name}, ${formatNumber(kcalFor(recipe, recipe.usualPortion))} kcal`}
          onPointerDown={press.onPointerDown}
          onPointerUp={press.onPointerUp}
          onPointerLeave={press.onPointerLeave}
          onPointerCancel={press.onPointerCancel}
          onContextMenu={press.onContextMenu}
          onClick={() => {
            if (!press.consumeLongPress()) onLog();
          }}
        >
          Log
        </Button>
      </div>
    </Card>
  );
}

export default function RecipesPage() {
  const state = useLadle();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [lastPickerId, setLastPickerId] = useState<string | null>(null);
  const [portion, setPortion] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const recipes = state
    ? [...state.data.recipes].sort((a, b) =>
        (b.lastEatenAt ?? "").localeCompare(a.lastEatenAt ?? ""),
      )
    : [];
  const q = query.trim().toLowerCase();
  const shown = q
    ? recipes.filter((r) => `${r.name} ${r.cuisine ?? ""}`.toLowerCase().includes(q))
    : recipes;
  const pickerRecipe = recipes.find((r) => r.id === (pickerId ?? lastPickerId)) ?? null;

  function log(recipe: Recipe, amount: number) {
    const entry = actions.logRecipe(recipe.id, amount);
    if (!entry) return;
    toast({
      message: `${recipe.name} logged · ${formatNumber(entry.kcal)} kcal`,
      actionLabel: "Undo",
      onAction: () => actions.deleteLog(entry.id),
    });
  }

  function openPicker(recipe: Recipe) {
    setPortion(recipe.usualPortion);
    setPickerId(recipe.id);
    setLastPickerId(recipe.id);
  }

  return (
    <>
      <ScreenHeader title="Recipes" />
      <div className="space-y-3 px-5 pb-8">
        <div className="flex gap-2">
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3">
            <SearchIcon className="shrink-0 text-ink-2" width={20} height={20} />
            <span className="sr-only">Search recipes</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="text-body min-w-0 flex-1 bg-transparent placeholder:text-ink-2 focus:outline-none"
            />
          </label>
          <Button className="shrink-0 px-4" onClick={() => setAddOpen(true)}>
            <PlusIcon width={20} height={20} /> Add recipe
          </Button>
        </div>

        {state && shown.length === 0 && (
          <p className="text-body py-6 text-center text-ink-2">
            No recipes match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}

        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id}>
              <RecipeCard
                recipe={r}
                onLog={() => log(r, r.usualPortion)}
                onPickPortion={() => openPicker(r)}
              />
            </li>
          ))}
        </ul>
      </div>

      <Sheet
        open={pickerId !== null}
        onClose={() => setPickerId(null)}
        title={pickerRecipe ? `Log ${pickerRecipe.name}` : "Log"}
      >
        {pickerRecipe && (
          <>
            <PortionPicker
              key={pickerRecipe.id}
              value={portion}
              onChange={setPortion}
              kcalPerServing={kcalFor(pickerRecipe, 1)}
            />
            <Button
              className="mt-5 w-full"
              onClick={() => {
                log(pickerRecipe, portion);
                setPickerId(null);
              }}
            >
              Log {formatPortion(portion)} · {formatNumber(kcalFor(pickerRecipe, portion))} kcal
            </Button>
          </>
        )}
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add a recipe">
        <p className="text-body">
          Importing from a link, pasted text or a photo of a recipe card arrives in Milestone 3.
        </p>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setAddOpen(false)}>
          OK
        </Button>
      </Sheet>
    </>
  );
}
