"use client";

// Pantry tab (F9): batches and leftovers. Milestone 1 shows the seed batch;
// batch cooking and the "Still have it?" check arrive in Milestone 7.

import { Card, ComingSoon, ScreenHeader } from "@/components/ui";
import { useLadle } from "@/lib/store";

export default function PantryPage() {
  const state = useLadle();
  const batches = state?.data.batches.filter((b) => b.servingsLeft > 0) ?? [];

  return (
    <>
      <ScreenHeader title="Pantry" />
      <div className="space-y-4 px-5 pb-8">
        {batches.map((b) => {
          const recipe = state?.data.recipes.find((r) => r.id === b.recipeId);
          return (
            <Card key={b.id}>
              <p className="text-headline">{recipe?.name ?? "Batch"}</p>
              <p className="text-body tabular mt-1 text-ink-2">
                {b.servingsLeft} of {b.servingsMade} servings left
              </p>
            </Card>
          );
        })}
        <ComingSoon title="Coming in Milestone 7">
          Cooking as a batch, logging leftovers, and food from outside the kitchen.
        </ComingSoon>
      </div>
    </>
  );
}
