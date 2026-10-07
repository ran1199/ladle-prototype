"use client";

// Recipe card (F4): totals, macros per serving, confidence, ingredients,
// change history, "Log a serving" and "Cook as a batch".

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BatchSheet } from "@/components/BatchSheet";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { DishIllustration } from "@/components/DishIllustration";
import { LogButton } from "@/components/LogButton";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { BackLink, Button, ButtonLink, Card, ScreenHeader } from "@/components/ui";
import { formatNumber, kcalNumber } from "@/lib/format";
import { pendingSuggestion } from "@/lib/fixes";
import { activeBatch, kcalFor, logKcal, recipeConfidence, sumMacros } from "@/lib/logic";
import { actions, useLadle } from "@/lib/store";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-control)] bg-surface-2 px-3 py-3 text-center">
      <p className="text-headline tabular">{value}</p>
      <p className="text-caption text-ink-2">{label}</p>
    </div>
  );
}

export default function RecipeCardPage() {
  const { id } = useParams<{ id: string }>();
  const state = useLadle();
  const toast = useToast();
  const [batchOpen, setBatchOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  // Opening a recipe is a hint for plate matching ("probably cooking this tonight").
  useEffect(() => {
    actions.markOpened(id);
  }, [id]);

  const back = <BackLink href="/recipes" label="Recipes" />;
  if (!state) return <ScreenHeader title="" leading={back} />;

  const recipe = state.data.recipes.find((r) => r.id === id);
  if (!recipe) {
    return (
      <>
        <ScreenHeader title="Recipe not found" leading={back} />
        <div className="px-5">
          <Card>
            <p className="text-body">This recipe isn&rsquo;t in your library.</p>
            <ButtonLink href="/recipes" variant="secondary" className="mt-4 w-full">
              Back to Recipes
            </ButtonLink>
          </Card>
        </div>
      </>
    );
  }

  const suggestion = pendingSuggestion(recipe, state.data.fixes);
  const totals = sumMacros(recipe.ingredients);
  const per = (n: number) => Math.round(n / recipe.servings);
  const sourceIsLink = recipe.source?.startsWith("http");

  const batch = activeBatch(state.data, recipe.id);

  function logServing() {
    if (!recipe) return;
    const log = actions.logRecipe(recipe.id, 1, { via: "one-tap" });
    if (!log) return;
    toast({
      message: `${recipe.name} logged · ${kcalNumber(log.kcal, log.confidence)} kcal${log.batchId ? " · from your batch" : ""}`,
      actionLabel: "Undo",
      onAction: () => actions.deleteLog(log.id),
    });
  }

  function cookBatch(servingsMade: number) {
    if (!recipe) return;
    const { undo } = actions.startBatch(recipe.id, servingsMade);
    setBatchOpen(false);
    toast({
      message: `Batch started · ${servingsMade} ${servingsMade === 1 ? "serving" : "servings"} in your Pantry`,
      actionLabel: "Undo",
      onAction: undo,
    });
  }

  return (
    <>
      <ScreenHeader title={recipe.name} leading={back} />
      <div className="space-y-4 px-5 pb-8">
        <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {recipe.cuisine && (
            <span className="text-caption rounded-full bg-surface-2 px-2.5 py-0.5 text-ink-2">
              {recipe.cuisine}
            </span>
          )}
          <ConfidenceIndicator
            level={recipeConfidence(recipe, state.data.fixes)}
            recipe={recipe}
            pending={suggestion !== null}
          />
        </div>

        {suggestion && (
          <Card className="border-2 border-estimate">
            <p className="text-headline">{suggestion.text}</p>
            <p className="text-caption mt-1 text-ink-2">
              Ladle never changes a recipe without asking.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  actions.resolveSuggestion(recipe.id, suggestion, true);
                  toast({ message: "Recipe updated. Ladle will remember that." });
                }}
              >
                Update recipe
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => actions.resolveSuggestion(recipe.id, suggestion, false)}
              >
                Not now
              </Button>
            </div>
          </Card>
        )}

        {recipe.photo ? (
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="View the recipe photo larger"
            className="block w-full overflow-hidden rounded-[var(--radius-card)]"
          >
            <Image
              src={recipe.photo.src}
              alt={recipe.photo.alt}
              unoptimized={recipe.photo.src.startsWith("data:")}
              width={1200}
              height={860}
              className="h-auto w-full"
            />
          </button>
        ) : (
          <div className="flex justify-center rounded-[var(--radius-card)] bg-surface py-4">
            <DishIllustration kind={recipe.illustration} seed={recipe.id} size={120} />
          </div>
        )}

        <Card>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={formatNumber(totals.kcal)} label="kcal total" />
            <Stat
              value={String(recipe.servings)}
              label={recipe.servings === 1 ? "serving" : "servings"}
            />
            <Stat value={formatNumber(kcalFor(recipe, 1))} label="per serving" />
          </div>
          <p className="text-caption tabular mt-3 text-center text-ink-2">
            Per serving: {per(totals.protein)} g protein · {per(totals.carbs)} g carbs ·{" "}
            {per(totals.fat)} g fat
          </p>
          {batch && (
            <p className="text-body tabular mt-3 rounded-[var(--radius-control)] bg-surface-2 px-4 py-3">
              Active batch: {batch.servingsLeft} of {batch.servingsMade} servings left
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <LogButton
              onClick={logServing}
              name={recipe.name}
              portion={1}
              kcal={logKcal(recipe, 1, batch)}
              level={recipeConfidence(recipe, state.data.fixes)}
            />
            <Button variant="secondary" onClick={() => setBatchOpen(true)}>
              Cook as a batch
            </Button>
          </div>
        </Card>

        <section aria-labelledby="ing-heading">
          <h2 id="ing-heading" className="text-title mt-2 mb-2">
            Ingredients
          </h2>
          <Card padded={false} className="px-5 py-1">
            <ul className="divide-y divide-line">
              {recipe.ingredients.map((i, index) => (
                <li key={index} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="text-body block">{i.text}</span>
                    {i.estimated && (
                      <span className="text-caption text-estimate-ink">Estimate</span>
                    )}
                  </span>
                  <span className="text-body tabular shrink-0 text-ink-2">
                    {formatNumber(i.kcal)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-caption mt-2 text-ink-2">
            Ingredient values are estimates from standard nutrition data.
          </p>
        </section>

        {recipe.source && (
          <p className="text-caption text-ink-2">
            Source:{" "}
            {sourceIsLink ? (
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-accent-strong underline underline-offset-2"
              >
                {recipe.source}
              </a>
            ) : (
              recipe.source
            )}
          </p>
        )}

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-title mt-2 mb-2">
            Change history
          </h2>
          {recipe.history.length === 0 ? (
            <p className="text-body text-ink-2">No changes yet.</p>
          ) : (
            <ul className="space-y-1">
              {recipe.history.map((h, index) => (
                <li key={index} className="text-body">
                  <span className="tabular text-ink-2">{formatDay(h.at)}:</span> {h.summary}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <BatchSheet
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        recipe={recipe}
        hasActiveBatch={batch !== null}
        onStart={cookBatch}
      />

      {recipe.photo && (
        <Sheet open={photoOpen} onClose={() => setPhotoOpen(false)} title="Recipe photo">
          <Image
            src={recipe.photo.src}
            alt={recipe.photo.alt}
            unoptimized={recipe.photo.src.startsWith("data:")}
            width={1200}
            height={860}
            className="h-auto w-full rounded-[var(--radius-control)]"
          />
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setPhotoOpen(false)}>
            Done
          </Button>
        </Sheet>
      )}
    </>
  );
}
