"use client";

// Plate camera (F5, F8). Full screen, without the tab bar.
// The viewfinder, sample photo and result sheet arrive in Milestone 4.

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/icons";
import { ModeBadge } from "@/components/ModeBadge";
import { ButtonLink, ComingSoon } from "@/components/ui";

export default function CameraPage() {
  const router = useRouter();

  function close() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="flex h-full flex-col" style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}>
      <div className="flex items-center justify-between px-3">
        <button
          type="button"
          onClick={close}
          aria-label="Close camera"
          className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface-2"
        >
          <CloseIcon />
        </button>
        <ModeBadge />
      </div>
      <h1 className="text-large-title mt-1 px-5">Snap a plate</h1>
      <div
        className="flex-1 space-y-4 px-5 pt-4"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}
      >
        <ComingSoon title="Coming in Milestone 4">
          A live camera, a sample plate photo, and Ladle&rsquo;s estimate of how much of the recipe
          you ate.
        </ComingSoon>
        <ButtonLink href="/" variant="secondary" className="w-full">
          Back to Today
        </ButtonLink>
      </div>
    </div>
  );
}
