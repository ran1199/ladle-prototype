"use client";

// Recipes tab (F6). Milestone 1 lists Maya's saved recipes; cards with
// one-tap logging and recipe import arrive in Milestones 2 and 3.

import { Card, ComingSoon, ScreenHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { recipeKcalPerServing } from "@/lib/seed";
import { useLadle } from "@/lib/store";

export default function RecipesPage() {
  const state = useLadle();
  const recipes = state
    ? [...state.data.recipes].sort((a, b) =>
        (b.lastEatenAt ?? "").localeCompare(a.lastEatenAt ?? ""),
      )
    : [];

  return (
    <>
      <ScreenHeader title="Recipes" />
      <div className="space-y-4 px-5 pb-8">
        {state && (
          <Card padded={false} className="px-5 py-2">
            <ul className="divide-y divide-line">
              {recipes.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="text-headline">{r.name}</p>
                  <p className="text-caption tabular mt-0.5 text-ink-2">
                    {[
                      r.cuisine,
                      `${formatNumber(recipeKcalPerServing(r))} kcal per serving`,
                      `${r.servings} ${r.servings === 1 ? "serving" : "servings"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <ComingSoon title="Coming in Milestones 2 and 3">
          Recipe cards with one-tap logging, search, and importing a recipe from a link, text or a
          photo of a recipe card.
        </ComingSoon>
      </div>
    </>
  );
}
