// Daily target rules. Ladle never sets a target below a safe floor:
// 1,200 kcal a day for women and 1,500 for men.

import type { Profile } from "./types";

export const SAFE_FLOOR: Record<Profile["sex"], number> = { female: 1200, male: 1500 };
export const MAX_TARGET = 5000;

/** A gentle note when a target is below the floor, or null when it's fine. */
export function targetNote(target: number, sex: Profile["sex"]): string | null {
  const floor = SAFE_FLOOR[sex];
  if (target >= floor) return null;
  return `Ladle doesn’t set targets below ${floor.toLocaleString("en-US")} kcal a day. Eating less than that is hard to do safely on your own. If you’d like to go lower, it’s worth talking to a doctor or a registered dietitian.`;
}

export const LB_PER_KG = 2.20462;
