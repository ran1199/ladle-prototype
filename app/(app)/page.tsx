"use client";

// Today tab (F2). Milestone 1 shows Maya's seed data in a simple form;
// the budget card, meal list and quick actions arrive in Milestone 2.

import { Card, ComingSoon, ScreenHeader } from "@/components/ui";
import { formatLongDate, formatNumber, formatTime, isSameDay } from "@/lib/format";
import { useLadle } from "@/lib/store";

export default function TodayPage() {
  const state = useLadle();
  const now = new Date();
  const subtitle = state ? formatLongDate(now) : undefined;

  if (!state) return <ScreenHeader title="Today" />;

  const { profile, logs } = state.data;
  const todays = logs
    .filter((l) => isSameDay(new Date(l.at), now))
    .sort((a, b) => a.at.localeCompare(b.at));
  const eaten = todays.reduce((s, l) => s + l.kcal, 0);
  const left = profile.dailyTarget - eaten;

  return (
    <>
      <ScreenHeader title={`Welcome back, ${profile.name}.`} subtitle={subtitle} />
      <div className="space-y-4 px-5 pb-8">
        <Card>
          <p className="text-headline tabular">
            {left >= 0
              ? `${formatNumber(left)} left`
              : `${formatNumber(-left)} over today, that's fine`}
          </p>
          <p className="text-caption tabular mt-1 text-ink-2">
            {formatNumber(eaten)} eaten of {formatNumber(profile.dailyTarget)}
          </p>
          <ul className="mt-4 divide-y divide-line">
            {todays.map((l) => (
              <li key={l.id} className="text-body tabular flex justify-between gap-3 py-2">
                <span>
                  <span className="text-ink-2">{formatTime(l.at)}</span> · {l.name}
                </span>
                <span>{formatNumber(l.kcal)} kcal</span>
              </li>
            ))}
          </ul>
        </Card>
        <ComingSoon title="Coming in Milestone 2">
          The budget card, meal details, quick actions and the leftovers nudge.
        </ComingSoon>
      </div>
    </>
  );
}
