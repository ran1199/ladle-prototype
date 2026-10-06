"use client";

// Pantry tab (F9): batches you cooked and their leftovers. Fresh batches count
// down as you log servings; after 4 days Ladle asks "Still have it?".

import { BatchCard, StillHaveCard } from "@/components/BatchCards";
import { ButtonLink, Card, ScreenHeader } from "@/components/ui";
import { isFreshBatch, isStaleBatch } from "@/lib/logic";
import { useLadle } from "@/lib/store";

export default function PantryPage() {
  const state = useLadle();
  if (!state) return <ScreenHeader title="Pantry" />;

  const now = new Date();
  const { batches, recipes } = state.data;
  const recipeFor = (id: string) => recipes.find((r) => r.id === id);
  const byNewest = [...batches].sort((a, b) => b.cookedAt.localeCompare(a.cookedAt));
  const stale = byNewest.filter((b) => isStaleBatch(b, now) && recipeFor(b.recipeId));
  const fresh = byNewest.filter((b) => isFreshBatch(b, now) && recipeFor(b.recipeId));

  return (
    <>
      <ScreenHeader title="Pantry" subtitle="Batches you cooked and what’s left." />
      <div className="space-y-4 px-5 pb-8">
        {stale.map((b) => (
          <StillHaveCard key={b.id} batch={b} recipe={recipeFor(b.recipeId)!} />
        ))}
        {fresh.map((b) => (
          <BatchCard key={b.id} batch={b} recipe={recipeFor(b.recipeId)!} />
        ))}
        {stale.length === 0 && fresh.length === 0 && (
          <Card>
            <p className="text-headline">No leftovers right now</p>
            <p className="text-body mt-1 text-ink-2">
              Cooking a big pot? Open the recipe and tap &ldquo;Cook as a batch&rdquo;. Ladle counts
              down the servings as you eat them.
            </p>
            <ButtonLink href="/recipes" variant="secondary" className="mt-4 w-full">
              Go to Recipes
            </ButtonLink>
          </Card>
        )}
      </div>
    </>
  );
}
