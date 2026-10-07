// Formatting helpers so numbers and dates read the same everywhere.

import type { Confidence } from "./types";

const number = new Intl.NumberFormat("en-US");

/** 1600 → "1,600" */
export function formatNumber(n: number): string {
  return number.format(Math.round(n));
}

/** "Monday, October 5" */
export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** "8:10 am" */
export function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace("AM", "am")
    .replace("PM", "pm");
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Good and rough estimates are shown rounded; "Your recipe ✓" and "From the label" are exact. */
export function isEstimate(level: Confidence): boolean {
  return level === "good" || level === "rough";
}

/**
 * Calories as shown next to a confidence label: 533 (good) → "about 530",
 * 533 (Your recipe ✓) → "533". The stored value stays exact.
 */
export function kcalNumber(kcal: number, level: Confidence): string {
  return isEstimate(level) ? `about ${formatNumber(shownKcal(kcal, level))}` : formatNumber(kcal);
}

/** The number itself: estimates rounded to the nearest 10. */
export function shownKcal(kcal: number, level: Confidence): number {
  return isEstimate(level) ? Math.round(kcal / 10) * 10 : Math.round(kcal);
}
