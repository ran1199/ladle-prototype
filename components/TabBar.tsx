"use client";

// Fixed bottom tab bar with five positions. The center camera button is a
// large raised terracotta circle that opens the plate camera.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { CameraIcon, MeIcon, PantryIcon, RecipesIcon, TodayIcon } from "./icons";

type Tab = { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

const LEFT: Tab[] = [
  { href: "/", label: "Today", Icon: TodayIcon },
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
];
const RIGHT: Tab[] = [
  { href: "/pantry", label: "Pantry", Icon: PantryIcon },
  { href: "/me", label: "Me", Icon: MeIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] text-[11px] leading-[13px] font-medium transition-colors duration-200 ${
        active ? "text-accent-strong" : "text-ink-2 hover:text-ink"
      }`}
    >
      <tab.Icon strokeWidth={active ? 2.2 : 1.8} />
      {tab.label}
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="relative z-20 shrink-0 border-t border-line bg-surface shadow-float"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="flex h-16 items-stretch px-2">
        {LEFT.map((t) => (
          <TabLink key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}
        <div className="flex flex-1 justify-center">
          <Link
            href="/camera"
            aria-label="Camera: snap a plate"
            className="-mt-5 flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-float ring-4 ring-surface transition-transform duration-200 active:scale-95"
          >
            <CameraIcon width={30} height={30} strokeWidth={2} />
          </Link>
        </div>
        {RIGHT.map((t) => (
          <TabLink key={t.href} tab={t} active={isActive(pathname, t.href)} />
        ))}
      </div>
    </nav>
  );
}
