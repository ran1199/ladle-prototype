"use client";

// Today tab (F2): daily budget, today's meals grouped by time of day,
// quick actions and the leftovers nudge.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LeftoverNudge, StillHaveCard } from "@/components/BatchCards";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { DishIllustration } from "@/components/DishIllustration";
import { BasketIcon, CameraIcon, RecipesIcon } from "@/components/icons";
import { LogDetailSheet } from "@/components/LogDetailSheet";
import { Card, ScreenHeader } from "@/components/ui";
import { formatLongDate, formatNumber, formatTime, isSameDay } from "@/lib/format";
import {
  formatPortion,
  isFreshBatch,
  isStaleBatch,
  isReturningAfterBreak,
  MEAL_GROUPS,
  mealGroup,
} from "@/lib/logic";
import { clearPlate, getPlate } from "@/lib/plate";
import { useLadle } from "@/lib/store";
import type { LogEntry, Recipe } from "@/lib/types";

function BudgetCard({ eaten, target }: { eaten: number; target: number }) {
  const left = target - eaten;
  const over = left < 0;
  const share = Math.min(1, eaten / target);
  return (
    <Card>
      {over ? (
        <>
          <p className="font-display tabular text-[44px] leading-[50px] font-semibold text-ink-2">
            {formatNumber(-left)} <span className="text-title">over today</span>
          </p>
          <p className="text-body mt-1 text-ink-2">That&rsquo;s fine. Tomorrow is a new page.</p>
        </>
      ) : (
        <p className="font-display tabular text-[44px] leading-[50px] font-semibold">
          {formatNumber(left)} <span className="text-title">left</span>
        </p>
      )}
      <p className="text-body tabular mt-1 text-ink-2">
        {formatNumber(eaten)} eaten of {formatNumber(target)}
      </p>
      <div
        role="progressbar"
        aria-label="Eaten today"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={eaten}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${over ? "bg-rough" : "bg-accent"}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  href,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "text-caption flex min-h-[76px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] bg-surface px-2 text-center font-semibold text-ink hover:brightness-[0.98]";
  const inner = (
    <>
      <span className="text-accent-strong">{icon}</span>
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function MealRow({
  log,
  recipe,
  onOpen,
}: {
  log: LogEntry;
  recipe: Recipe | null;
  onOpen: () => void;
}) {
  return (
    <li className="relative flex items-center gap-3 py-3">
      {recipe ? (
        <DishIllustration kind={recipe.illustration} seed={recipe.id} size={48} />
      ) : (
        <DishIllustration kind="plate" seed={log.name} size={48} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-headline truncate">{log.name}</p>
        <p className="text-caption tabular text-ink-2">
          {formatPortion(log.portion)} · {formatTime(log.at)}
          {log.batchId ? " · from batch" : ""}
          {log.adjustments?.length ? ` · ${log.adjustments.map((a) => a.label).join(", ")}` : ""}
        </p>
        {/* Sits above the row's tap area so it opens its own explanation. */}
        <ConfidenceIndicator level={log.confidence} recipe={recipe} className="relative z-10" />
      </div>
      <p className="tabular shrink-0 text-right">
        <span className="text-headline block">{formatNumber(log.kcal)}</span>
        <span className="text-caption text-ink-2">kcal</span>
      </p>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${log.name}, ${formatPortion(log.portion)}, ${formatNumber(log.kcal)} kcal. Edit`}
        className="absolute inset-0 rounded-[var(--radius-control)] hover:bg-surface-2/40"
      />
    </li>
  );
}

/** A plate photo saved before analysis but not logged yet (local-first: nothing is lost). */
function PendingPlateCard() {
  const [plate, setPlate] = useState(() => getPlate());
  if (!plate) return null;
  return (
    <Card className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-headline">A plate photo is waiting</p>
        <p className="text-body text-ink-2">Finish logging it, or let it go.</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Link
          href="/camera"
          className="text-headline inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-accent-strong px-4 text-on-accent"
        >
          Finish
        </Link>
        <button
          type="button"
          onClick={() => {
            clearPlate();
            setPlate(null);
          }}
          className="text-caption min-h-9 font-semibold text-ink-2"
        >
          Discard
        </button>
      </div>
    </Card>
  );
}

export default function TodayPage() {
  const state = useLadle();
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  if (!state) return <ScreenHeader title="Today" />;

  const now = new Date();
  const { profile, logs, recipes, batches } = state.data;
  const recipeById = (id: string | null) => recipes.find((r) => r.id === id) ?? null;
  const todays = logs
    .filter((l) => isSameDay(new Date(l.at), now))
    .sort((a, b) => a.at.localeCompare(b.at));
  const eaten = todays.reduce((s, l) => s + l.kcal, 0);
  const freshBatches = batches.filter((b) => isFreshBatch(b, now));
  const staleBatches = batches.filter((b) => isStaleBatch(b, now));
  const returning = todays.length === 0 && isReturningAfterBreak(logs, now);
  const openLog = logs.find((l) => l.id === openLogId) ?? null;

  return (
    <>
      <ScreenHeader title={`Welcome back, ${profile.name}.`} subtitle={formatLongDate(now)} />
      <div className="space-y-4 px-5 pb-8">
        {returning && (
          <Card>
            <p className="text-headline">Welcome back. Pick up where you left off.</p>
            <p className="text-body mt-1 text-ink-2">
              Your recipes are all here. Log today&rsquo;s first meal whenever you&rsquo;re ready.
            </p>
          </Card>
        )}

        <BudgetCard eaten={eaten} target={profile.dailyTarget} />

        <PendingPlateCard />

        <nav aria-label="Quick actions" className="flex gap-2">
          <QuickAction icon={<CameraIcon />} label="Snap a plate" href="/camera" />
          <QuickAction icon={<RecipesIcon />} label="Log a recipe" href="/recipes" />
          <QuickAction icon={<BasketIcon />} label="Add other food" href="/add-food" />
        </nav>

        {staleBatches.map((b) => {
          const recipe = recipeById(b.recipeId);
          return recipe ? <StillHaveCard key={b.id} batch={b} recipe={recipe} /> : null;
        })}

        {freshBatches.map((b) => {
          const recipe = recipeById(b.recipeId);
          return recipe ? <LeftoverNudge key={b.id} batch={b} recipe={recipe} /> : null;
        })}

        <section aria-labelledby="meals-heading">
          <h2 id="meals-heading" className="text-title mt-6 mb-1">
            Today&rsquo;s meals
          </h2>
          {todays.length === 0 ? (
            <p className="text-body py-3 text-ink-2">Nothing logged yet today.</p>
          ) : (
            MEAL_GROUPS.map((group) => {
              const items = todays.filter((l) => mealGroup(l.at) === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="mt-3">
                  <h3 className="text-caption font-semibold tracking-wide text-ink-2 uppercase">
                    {group}
                  </h3>
                  <ul className="divide-y divide-line">
                    {items.map((l) => (
                      <MealRow
                        key={l.id}
                        log={l}
                        recipe={recipeById(l.recipeId)}
                        onOpen={() => setOpenLogId(l.id)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>

      <LogDetailSheet
        log={openLog}
        recipe={openLog ? recipeById(openLog.recipeId) : null}
        onClose={() => setOpenLogId(null)}
      />

    </>
  );
}
