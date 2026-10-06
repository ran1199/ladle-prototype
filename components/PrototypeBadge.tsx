"use client";

// Small pill at the top of every screen, so visitors and test participants
// always know the AI here is simulated. Tapping it explains how.
// A hidden test control can hide it (for clean screenshots).

import { useState } from "react";
import { PROTOTYPE_NOTE } from "@/lib/content";
import { useTestFlags } from "@/lib/testControls";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

export function PrototypeBadge() {
  const flags = useTestFlags();
  const [open, setOpen] = useState(false);
  if (flags.hidePill) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-caption inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-3 font-medium text-ink-2 hover:brightness-[0.97]"
        aria-label="Prototype: about Ladle’s simulated AI"
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-rough" />
        Prototype
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="A prototype">
        <p className="text-body">{PROTOTYPE_NOTE}</p>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setOpen(false)}>
          OK
        </Button>
      </Sheet>
    </>
  );
}
