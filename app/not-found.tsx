// A link that doesn't go anywhere in Ladle.

import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-surface p-6 text-center">
        <h1 className="text-title">This page isn&rsquo;t in Ladle</h1>
        <p className="text-body mt-2 text-ink-2">The link may be old or mistyped.</p>
        <ButtonLink href="/" className="mt-5 w-full">
          Go to Today
        </ButtonLink>
      </div>
    </main>
  );
}
