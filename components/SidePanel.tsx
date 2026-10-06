"use client";

// Desktop and tablet only: a calm panel beside the phone with what Ladle is
// and a Reset demo button.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actions } from "@/lib/store";
import { AboutLinks, AboutSummary } from "./AboutContent";
import { LadleMark } from "./icons";
import { Button } from "./ui";

export function SidePanel({ caseStudyUrl }: { caseStudyUrl: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    actions.resetDemo();
    setConfirming(false);
    setDone(true);
    router.push("/");
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <aside aria-label="About this prototype" className="w-full max-w-[400px] py-6">
      <div className="flex items-center gap-3">
        <LadleMark width={40} height={40} />
        <p className="font-display text-[34px] leading-10 font-semibold text-ink">Ladle</p>
      </div>
      <p className="text-headline mt-1 text-ink-2">Calorie tracking for home cooks</p>

      <div className="mt-5">
        <AboutSummary />
      </div>

      <div className="mt-8 border-t border-line pt-5">
        {!confirming ? (
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              Reset demo
            </Button>
            <p role="status" className="text-caption text-confirmed">
              {done ? "Demo reset ✓" : ""}
            </p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] bg-surface p-4">
            <p className="text-body">
              Start over with Maya&rsquo;s original data? Changes you made in this browser will be
              cleared.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={reset}>Reset demo</Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <AboutLinks caseStudyUrl={caseStudyUrl} />
      </div>
    </aside>
  );
}
