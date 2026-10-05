// Formatting helpers so numbers and dates read the same everywhere.

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
