"use client";

// A one-tap Log button that shows the calories before you tap: "Log · 420",
// or "Log · about 530" for an estimate. The accessible name says it in full:
// "Log 1 serving of Chicken adobo, 420 kcal". One-tap logs are quick logs:
// they don't count towards "Your recipe ✓".

import type { ComponentProps } from "react";
import { kcalNumber } from "@/lib/format";
import { formatPortion } from "@/lib/logic";
import type { Confidence } from "@/lib/types";
import { Button } from "./ui";

export function LogButton({
  name,
  portion,
  kcal,
  level,
  className = "",
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  name: string;
  portion: number;
  kcal: number;
  level: Confidence;
}) {
  const shown = kcalNumber(kcal, level);
  return (
    <Button
      aria-label={`Log ${formatPortion(portion)} of ${name}, ${shown} kcal`}
      className={`tabular px-4 whitespace-nowrap ${className}`}
      {...props}
    >
      Log · {shown}
    </Button>
  );
}
