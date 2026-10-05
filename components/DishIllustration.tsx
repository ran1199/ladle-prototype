// Simple flat illustrations of a bowl, plate, jar or pot in the Ladle palette,
// used until real dish photos are added. The food color varies by recipe.

import type { Recipe } from "@/lib/types";

const FOOD = ["var(--accent)", "var(--estimate)", "var(--confirmed)"];

function foodColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FOOD[h % FOOD.length];
}

export function DishIllustration({
  kind,
  seed,
  size = 56,
}: {
  kind: Recipe["illustration"];
  seed: string;
  size?: number;
}) {
  const food = foodColor(seed);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect width="56" height="56" rx="16" fill="var(--surface-2)" />
      {kind === "bowl" && (
        <>
          <ellipse cx="28" cy="27" rx="17" ry="5" fill={food} />
          <path d="M11 27h34a17 15 0 0 1-34 0z" fill="var(--surface)" />
          <path d="M11 27h34a17 15 0 0 1-34 0z" fill="none" stroke="var(--line)" />
          <circle cx="22" cy="25.5" r="2" fill="var(--surface)" opacity="0.7" />
          <circle cx="31" cy="24.5" r="1.6" fill="var(--surface)" opacity="0.6" />
        </>
      )}
      {kind === "plate" && (
        <>
          <ellipse cx="28" cy="30" rx="19" ry="11" fill="var(--surface)" stroke="var(--line)" />
          <ellipse cx="28" cy="29" rx="12" ry="6.5" fill={food} />
          <circle cx="24" cy="27.5" r="2.2" fill="var(--estimate)" opacity="0.9" />
          <circle cx="32" cy="30" r="1.8" fill="var(--confirmed)" opacity="0.9" />
        </>
      )}
      {kind === "jar" && (
        <>
          <rect x="18" y="12" width="20" height="5" rx="2" fill="var(--ink-2)" opacity="0.5" />
          <rect
            x="16"
            y="16"
            width="24"
            height="28"
            rx="6"
            fill="var(--surface)"
            stroke="var(--line)"
          />
          <rect x="18.5" y="27" width="19" height="14.5" rx="4" fill={food} />
          <circle cx="23" cy="30" r="1.6" fill="var(--surface)" opacity="0.7" />
          <circle cx="31" cy="33" r="1.4" fill="var(--surface)" opacity="0.7" />
        </>
      )}
      {kind === "pot" && (
        <>
          <ellipse cx="28" cy="22" rx="16" ry="4" fill={food} />
          <path
            d="M12 22h32v13a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7z"
            fill="var(--surface)"
            stroke="var(--line)"
          />
          <rect x="6" y="24" width="7" height="3" rx="1.5" fill="var(--ink-2)" opacity="0.5" />
          <rect x="43" y="24" width="7" height="3" rx="1.5" fill="var(--ink-2)" opacity="0.5" />
        </>
      )}
    </svg>
  );
}
