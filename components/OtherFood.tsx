"use client";

// Pieces for food that isn't one of your recipes (F10), shared by
// "Add other food" and the camera's "It's something new":
// - FoodSearchPanel: search Ladle's food list (typical values, "Good estimate");
// - DishTypePanel: "What kind of dish is it?" (restaurant meals, "Rough estimate");
// - FoodLogPanel: pick how many servings, see the calories, log it.

import { useEffect, useId, useState } from "react";
import { ai, AIError, type FoodResult } from "@/lib/ai";
import { formatNumber } from "@/lib/format";
import { DISH_TYPES, OTHER_DISH } from "@/lib/mock-ai/restaurant";
import type { Confidence } from "@/lib/types";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { SearchIcon } from "./icons";
import { PortionPicker } from "./PortionPicker";
import { Button } from "./ui";

export const ROUGH_NOTE = "Restaurant food often has hidden oil and sauce. This is a rough guide.";

/** More than this many servings gets a "Is that right?" check. */
const LOTS_OF_SERVINGS = 4;

export function FoodSearchPanel({
  onPick,
  autoFocus = false,
}: {
  onPick: (food: FoodResult) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searched, setSearched] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Search as the user types (Ladle's built-in food list; quick).
  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const t = setTimeout(() => {
      if (!q) {
        setResults([]);
        setSearched("");
        return;
      }
      ai.searchFood(q)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
          setSearched(q);
          setError(null);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof AIError ? e.message : "Search didn’t work. Try again.");
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div>
      <label className="flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3">
        <SearchIcon className="shrink-0 text-ink-2" width={20} height={20} />
        <span className="sr-only">Search foods</span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. latte, banana, pad thai"
          className="text-body min-w-0 flex-1 bg-transparent placeholder:text-ink-2 focus:outline-none"
        />
      </label>
      <ul className="mt-2 divide-y divide-line" aria-live="polite">
        {results.map((f) => (
          <li key={f.name}>
            <button
              type="button"
              onClick={() => onPick(f)}
              className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="text-headline block">{f.name}</span>
                <span className="text-caption text-ink-2">{f.servingLabel}</span>
              </span>
              <span className="text-body tabular shrink-0">{formatNumber(f.kcal)} kcal</span>
            </button>
          </li>
        ))}
        {searched && results.length === 0 && (
          <li className="text-body py-4 text-ink-2">No foods match. Try another word.</li>
        )}
      </ul>
      {error && (
        <p role="alert" className="text-body mt-2 text-ink-2">
          {error}
        </p>
      )}
    </div>
  );
}

export function DishTypePanel({
  onEstimate,
  onOther,
}: {
  onEstimate: (food: FoodResult) => void;
  /** "Other": search instead. */
  onOther: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(dishType: string) {
    if (dishType === OTHER_DISH) return onOther();
    setBusy(dishType);
    setError(null);
    try {
      onEstimate(await ai.estimateRestaurantPlate({ dishType }));
    } catch (e) {
      setError(e instanceof AIError ? e.message : "Ladle couldn’t estimate that. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div role="group" aria-label="Kind of dish" className="flex flex-wrap gap-2">
        {[...DISH_TYPES.map((d) => d.label), OTHER_DISH].map((label) => (
          <button
            key={label}
            type="button"
            disabled={busy !== null}
            onClick={() => void choose(label)}
            className="text-body min-h-11 rounded-full bg-surface-2 px-4 font-medium hover:brightness-[0.97] disabled:opacity-50"
          >
            {busy === label ? "…" : label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-body mt-3 text-ink-2">
          {error}
        </p>
      )}
    </div>
  );
}

export function FoodLogPanel({
  food,
  confidence,
  eyebrow,
  note,
  onLog,
  onBack,
}: {
  food: FoodResult;
  confidence: Confidence;
  /** Small text above the name, e.g. "From the label". */
  eyebrow?: string;
  note?: string;
  onLog: (servings: number) => void;
  onBack: () => void;
}) {
  const [servings, setServings] = useState(1);
  const [checking, setChecking] = useState(false);
  const checkId = useId();
  const kcal = Math.round(food.kcal * servings);

  return (
    <div>
      {eyebrow && <p className="text-caption text-ink-2">{eyebrow}</p>}
      <h2 className="text-title">{food.name}</h2>
      <p className="text-caption text-ink-2">Serving: {food.servingLabel}</p>

      <p className="text-headline mt-4">How many servings?</p>
      <div className="mt-2">
        <PortionPicker
          value={servings}
          onChange={(s) => {
            setServings(s);
            setChecking(false);
          }}
          kcalPerServing={food.kcal}
          label="Servings"
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-display tabular text-[34px] leading-10 font-semibold">
          {formatNumber(kcal)} <span className="text-title">kcal</span>
        </p>
        <ConfidenceIndicator level={confidence} />
      </div>
      {note && <p className="text-body mt-2 text-ink-2">{note}</p>}

      {checking ? (
        <div
          role="alertdialog"
          aria-labelledby={checkId}
          className="mt-4 rounded-[var(--radius-card)] border-2 border-estimate p-4"
        >
          <p id={checkId} className="text-headline">
            That&rsquo;s a lot of servings. Is that right?
          </p>
          <p className="text-caption mt-1 text-ink-2">
            {formatNumber(servings)} × {food.servingLabel}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => onLog(servings)}>Yes, log it</Button>
            <Button variant="secondary" onClick={() => setChecking(false)}>
              Change
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="mt-4 w-full"
          onClick={() => (servings > LOTS_OF_SERVINGS ? setChecking(true) : onLog(servings))}
        >
          Log it
        </Button>
      )}
      <Button variant="quiet" className="mt-1 w-full" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
