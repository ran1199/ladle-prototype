// Small shared building blocks: buttons, cards and the screen header.

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { PrototypeBadge } from "./PrototypeBadge";

type Variant = "primary" | "secondary" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent-strong text-on-accent hover:brightness-95",
  secondary: "bg-surface-2 text-ink hover:brightness-[0.97]",
  quiet: "bg-transparent text-accent-strong hover:bg-surface-2",
};

function buttonClass(variant: Variant, extra = "") {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 text-headline transition-[filter,background-color] duration-200 disabled:opacity-50 ${VARIANTS[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function ExternalButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass(variant, className)}
      {...props}
    />
  );
}

export function Card({
  className = "",
  padded = true,
  children,
}: {
  className?: string;
  /** Set to false for cards made of full-width rows that bring their own padding. */
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-surface ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Top of every screen: the Prototype badge, then a large title. */
export function ScreenHeader({
  title,
  subtitle,
  leading,
}: {
  title: string;
  subtitle?: string;
  /** Optional control at top left, e.g. a back link. */
  leading?: ReactNode;
}) {
  return (
    <header className="px-5 pb-4" style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}>
      <div className="flex h-8 items-center justify-between">
        <div className="-ml-2">{leading}</div>
        <PrototypeBadge />
      </div>
      <h1 className="text-large-title mt-1">{title}</h1>
      {subtitle && <p className="text-body mt-1 text-ink-2">{subtitle}</p>}
    </header>
  );
}

/** "‹ Recipes" style back link for the top of a sub-screen. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-headline inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-accent-strong"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 6-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}

/** A calm note for screens whose features arrive in a later milestone. */
export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border border-dashed border-line bg-transparent">
      <p className="text-headline">{title}</p>
      <p className="text-body mt-1 text-ink-2">{children}</p>
    </Card>
  );
}
