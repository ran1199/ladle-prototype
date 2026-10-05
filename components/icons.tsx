// Simple line icons drawn for Ladle (no icon library needed).
// They inherit the text color, and are hidden from screen readers:
// the button or link around them carries the label.

import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const TodayIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Icon>
);

export const RecipesIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="M9 7.5h6M9 11h4" />
  </Icon>
);

export const CameraIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </Icon>
);

export const PantryIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 3.5h10M7.5 3.5v2.5h9V3.5" />
    <path d="M6.5 6h11a1 1 0 0 1 1 1v12.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V7a1 1 0 0 1 1-1z" />
    <path d="M5.5 11h13" />
  </Icon>
);

export const MeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" />
  </Icon>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const ExternalIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon width="18" height="18" {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </Icon>
);

/** Ladle's app icon: a cream ladle on a terracotta tile (same drawing as app/icon.svg). */
export const LadleMark = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" width="24" height="24" aria-hidden="true" focusable="false" {...p}>
    <rect width="64" height="64" rx="14" fill="var(--accent)" />
    <path d="M10 34h30a15 15 0 0 1-30 0z" fill="#FBF7F0" />
    <path
      d="M38 34 C42 25 45 17 47.5 11 C48.5 8.5 51.5 8.5 52 11"
      fill="none"
      stroke="#FBF7F0"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const MoreIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);

export const BasketIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 10h16l-1.6 8.4A2 2 0 0 1 16.4 20H7.6a2 2 0 0 1-2-1.6z" />
    <path d="m8.5 10 3-5.5M15.5 10l-3-5.5" />
  </Icon>
);
