"use client";

// Portion chips: ½, 1, 1½, 2, or Custom (a stepper in quarter servings).
// Each chip shows its calories so the choice is easy to compare.

import { useState } from "react";
import { formatAmount, formatPortion } from "@/lib/logic";
import { kcalNumber } from "@/lib/format";
import type { Confidence } from "@/lib/types";

const PRESETS = [0.5, 1, 1.5, 2];
const STEP = 0.25;
const MIN = 0.25;
const MAX = 10;

export function PortionPicker({
  value,
  onChange,
  kcalPerServing,
  label = "Portion",
  level = "confirmed",
}: {
  value: number;
  onChange: (portion: number) => void;
  kcalPerServing: number;
  label?: string;
  /** The confidence of these numbers: estimates show "about 270". */
  level?: Confidence;
}) {
  const [custom, setCustom] = useState(!PRESETS.includes(value));

  const chip = (active: boolean) =>
    `flex min-h-12 flex-col items-center justify-center py-1 rounded-[var(--radius-control)] px-2 transition-colors duration-200 ${
      active ? "bg-ink text-bg" : "bg-surface-2 text-ink hover:brightness-[0.97]"
    }`;

  return (
    <div role="group" aria-label={label}>
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((p) => {
          const active = !custom && value === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCustom(false);
                onChange(p);
              }}
              className={chip(active)}
            >
              <span className="text-headline">{formatAmount(p)}</span>
              <span
                className={`text-[11px] leading-[13px] tabular ${active ? "opacity-80" : "text-ink-2"}`}
              >
                {kcalNumber(kcalPerServing * p, level)}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className={chip(custom)}
        >
          <span className="text-caption font-semibold">Custom</span>
        </button>
      </div>

      {custom && (
        <div className="mt-3 flex items-center justify-between rounded-[var(--radius-control)] bg-surface-2 p-1.5">
          <button
            type="button"
            aria-label="Less"
            disabled={value <= MIN}
            onClick={() => onChange(Math.max(MIN, Math.round((value - STEP) * 4) / 4))}
            className="text-title flex size-11 items-center justify-center rounded-[10px] bg-surface disabled:opacity-40"
          >
            −
          </button>
          <p className="text-headline tabular" aria-live="polite">
            {formatPortion(value)}
          </p>
          <button
            type="button"
            aria-label="More"
            disabled={value >= MAX}
            onClick={() => onChange(Math.min(MAX, Math.round((value + STEP) * 4) / 4))}
            className="text-title flex size-11 items-center justify-center rounded-[10px] bg-surface disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
