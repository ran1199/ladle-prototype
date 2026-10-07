"use client";

// "How much did you take?" (for the user's own plate photos). A pan seen from
// above, divided into the recipe's servings, and a slider in quarter servings:
// the share you took fills in terracotta. From a batch, it's "the pot", and the
// servings already eaten are shown faded ("4 of 6 left"). The portion chips
// below stay in step with the slider.

import { kcalNumber } from "@/lib/format";
import type { Confidence } from "@/lib/types";
import { formatAmount, formatPortion } from "@/lib/logic";

const STEP = 0.25;

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 6, "⅙"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [5 / 6, "⅚"],
  [7 / 8, "⅞"],
];

/** 0.25 → "¼", 1/12 → "1/12", 1 → "all", 0.4 → "about 40%". */
export function shareText(share: number): string {
  if (share >= 0.999) return "all";
  const exact = FRACTIONS.find(([f]) => Math.abs(f - share) < 0.001);
  if (exact) return exact[1];
  // Other simple fractions, up to twelfths (e.g. ½ serving of a 6-serving pot = 1/12).
  for (let d = 2; d <= 12; d++) {
    const n = Math.round(share * d);
    if (n > 0 && Math.abs(n / d - share) < 0.001) return `${n}/${d}`;
  }
  return `about ${Math.round(share * 100)}%`;
}

/** The live label, e.g. "¼ of the pan · 1 serving · 533 kcal". */
export function portionLabel(
  portion: number,
  total: number,
  kcal: number,
  container: string,
  level: Confidence = "confirmed",
) {
  const share = shareText(Math.min(1, portion / total));
  const of = share === "all" ? `all of the ${container}` : `${share} of the ${container}`;
  return `${of} · ${formatPortion(portion)} · ${kcalNumber(kcal, level)} kcal`;
}

/** A point on the pan's rim, `turn` of the way round from the top (clockwise). */
function rim(turn: number, r: number, c: number) {
  const a = turn * 2 * Math.PI - Math.PI / 2;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

/** A wedge from `from` to `to` (fractions of the whole pan). */
function wedge(from: number, to: number, r: number, c: number): string {
  if (to - from >= 0.999)
    return `M ${c - r} ${c} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  const [x1, y1] = rim(from, r, c);
  const [x2, y2] = rim(to, r, c);
  return `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

function Pan({ servings, eaten, portion }: { servings: number; eaten: number; portion: number }) {
  const c = 60;
  const r = 50;
  const start = eaten / servings;
  const end = Math.min(1, (eaten + portion) / servings);
  return (
    <svg
      viewBox="0 0 150 120"
      width="150"
      height="120"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {/* handle */}
      <rect x="104" y="54" width="44" height="12" rx="6" fill="var(--line)" />
      <circle
        cx={c}
        cy={c}
        r={r + 6}
        fill="var(--surface-2)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      <circle cx={c} cy={c} r={r} fill="var(--surface)" />
      {eaten > 0 && <path d={wedge(0, start, r, c)} fill="var(--line)" opacity="0.6" />}
      {end > start && (
        <path
          d={wedge(start, end, r, c)}
          fill="var(--accent)"
          opacity="0.9"
          style={{ transition: "d var(--dur) var(--ease-out)" }}
        />
      )}
      {/* serving lines */}
      {servings > 1 &&
        Array.from({ length: servings }, (_, i) => {
          const [x, y] = rim(i / servings, r, c);
          return (
            <line
              key={i}
              x1={c}
              y1={c}
              x2={x}
              y2={y}
              stroke="var(--ink-2)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          );
        })}
    </svg>
  );
}

export function PortionHelper({
  photo,
  value,
  onChange,
  servings,
  servingsLeft,
  start,
  kcalFor,
  level,
}: {
  photo: { src: string; alt: string };
  value: number;
  onChange: (portion: number) => void;
  /** Servings in the whole pan (or the batch's pot). */
  servings: number;
  /** From a batch: servings still in the pot. */
  servingsLeft?: number;
  /**
   * Where the slider starts and what to call it: Ladle's estimate from the
   * sample photo, or your usual portion for your own photos.
   */
  start: { portion: number; label: string; differs: string };
  kcalFor: (portion: number) => number;
  /** Estimates show "about 530". */
  level: Confidence;
}) {
  const fromBatch = servingsLeft !== undefined;
  const container = fromBatch ? "pot" : "pan";
  const max = Math.max(STEP, fromBatch ? servingsLeft : servings);
  const eaten = fromBatch ? Math.max(0, servings - servingsLeft) : 0;
  const shown = Math.min(value, max);
  const label = portionLabel(value, servings, kcalFor(value), container, level);

  return (
    <div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, shown small */}
        <img src={photo.src} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
        <h2 className="text-headline">How much did you take?</h2>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Pan servings={servings} eaten={eaten} portion={shown} />
        <div className="min-w-0 flex-1">
          <p className="text-headline tabular" aria-hidden="true">
            {label.split(" · ")[0].replace(/^./, (ch) => ch.toUpperCase())}
          </p>
          <p className="text-caption tabular text-ink-2" aria-hidden="true">
            {label.split(" · ").slice(1).join(" · ")}
          </p>
          {fromBatch && (
            <p className="text-caption tabular mt-1 text-ink-2">
              {formatAmount(servingsLeft)} of {formatAmount(servings)} left
            </p>
          )}
          <p className="text-caption mt-1 font-semibold text-confirmed">
            {value === start.portion ? start.label : start.differs}
          </p>
        </div>
      </div>

      <input
        type="range"
        min={STEP}
        max={max}
        step={STEP}
        value={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Your share of the ${container}`}
        aria-valuetext={label}
        className="portion-slider mt-3 w-full"
        style={{ ["--fill" as string]: `${((shown - STEP) / Math.max(STEP, max - STEP)) * 100}%` }}
      />
      <div className="text-caption tabular flex justify-between text-ink-2" aria-hidden="true">
        <span>¼ serving</span>
        <span>{fromBatch ? `${formatAmount(max)} left` : `whole ${container}`}</span>
      </div>
    </div>
  );
}
