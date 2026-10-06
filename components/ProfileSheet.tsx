"use client";

// Edit your profile (Me tab): name, daily target (never below the safe floor),
// sex (sets that floor) and starting weight. Everything stays in this browser.

import { useId, useState } from "react";
import { formatNumber } from "@/lib/format";
import { LB_PER_KG, MAX_TARGET, SAFE_FLOOR, targetNote } from "@/lib/profile";
import type { Profile } from "@/lib/types";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

type Unit = "kg" | "lb";

export function ProfileSheet({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSave: (p: Profile) => void;
}) {
  const ids = { name: useId(), target: useId(), weight: useId(), note: useId() };
  const [name, setName] = useState(profile.name);
  const [target, setTarget] = useState(String(profile.dailyTarget));
  const [sex, setSex] = useState(profile.sex);
  const [unit, setUnit] = useState<Unit>("kg");
  const [weight, setWeight] = useState("");

  // Start from the saved profile each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(profile.name);
      setTarget(String(profile.dailyTarget));
      setSex(profile.sex);
      setUnit("kg");
      setWeight(profile.startingWeightKg ? String(Math.round(profile.startingWeightKg * 10) / 10) : "");
    }
  }

  const targetNum = Math.round(Number(target));
  const validTarget = target.trim() !== "" && Number.isFinite(targetNum);
  const note = validTarget ? targetNote(targetNum, sex) : null;
  const tooHigh = validTarget && targetNum > MAX_TARGET;
  const weightNum = weight.trim() === "" ? null : Number(weight);
  const weightOk = weightNum === null || (Number.isFinite(weightNum) && weightNum > 0 && weightNum < 700);
  const canSave = validTarget && !note && !tooHigh && weightOk;

  const field =
    "text-body tabular min-h-12 w-full rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2";
  const seg = (active: boolean) =>
    `text-headline min-h-11 rounded-[10px] transition-colors duration-200 ${
      active ? "bg-surface text-ink shadow-sm" : "text-ink-2"
    }`;

  function changeUnit(next: Unit) {
    if (next === unit) return;
    if (weightNum !== null && Number.isFinite(weightNum)) {
      const converted = next === "lb" ? weightNum * LB_PER_KG : weightNum / LB_PER_KG;
      setWeight(String(Math.round(converted * 10) / 10));
    }
    setUnit(next);
  }

  function save() {
    if (!canSave) return;
    const kg = weightNum === null ? null : unit === "kg" ? weightNum : weightNum / LB_PER_KG;
    onSave({
      name: name.trim(),
      sex,
      dailyTarget: targetNum,
      startingWeightKg: kg === null ? null : Math.round(kg * 10) / 10,
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your profile">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label htmlFor={ids.name} className="text-caption font-semibold text-ink-2">
            Name
          </label>
          <input
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            className={field}
          />
        </div>

        <div>
          <label htmlFor={ids.target} className="text-caption font-semibold text-ink-2">
            Daily target (kcal)
          </label>
          <input
            id={ids.target}
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
            aria-describedby={note || tooHigh ? ids.note : undefined}
            aria-invalid={!!note || tooHigh}
            className={field}
          />
          {(note || tooHigh) && (
            <div
              id={ids.note}
              role="status"
              className="text-body mt-2 rounded-[var(--radius-control)] border-2 border-estimate p-3"
            >
              <p>
                {note ??
                  `That’s higher than Ladle allows (${formatNumber(MAX_TARGET)} kcal). Check the number.`}
              </p>
              {note && (
                <button
                  type="button"
                  onClick={() => setTarget(String(SAFE_FLOOR[sex]))}
                  className="text-headline mt-1 min-h-11 text-accent-strong"
                >
                  Use {formatNumber(SAFE_FLOOR[sex])} kcal
                </button>
              )}
            </div>
          )}
        </div>

        <fieldset>
          <legend className="text-caption font-semibold text-ink-2">Sex (sets the safe minimum)</legend>
          <div className="mt-1 grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1">
            {(["female", "male"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sex === s}
                onClick={() => setSex(s)}
                className={seg(sex === s)}
              >
                {s === "female" ? "Female" : "Male"}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={ids.weight} className="text-caption font-semibold text-ink-2">
            Starting weight (optional)
          </label>
          <div className="flex gap-2">
            <input
              id={ids.weight}
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
              aria-invalid={!weightOk}
              className={field}
            />
            <div
              role="group"
              aria-label="Weight unit"
              className="grid shrink-0 grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1"
            >
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={unit === u}
                  onClick={() => changeUnit(u)}
                  className={`${seg(unit === u)} px-3`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          {!weightOk && (
            <p role="status" className="text-caption mt-1 text-ink-2">
              Check the weight, or leave it empty.
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={!canSave}>
          Save
        </Button>
      </form>
    </Sheet>
  );
}
