"use client";

// Me tab: how the simulated AI works, privacy, about this prototype, and Reset demo.
// Pressing and holding the version line opens the hidden test controls.
// Daily target, profile and data export come in Milestone 8.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AboutLinks, AboutSummary, TryThese } from "@/components/AboutContent";
import { ChevronIcon } from "@/components/icons";
import { Sheet } from "@/components/Sheet";
import { useSiteConfig } from "@/components/SiteConfig";
import { TestControls } from "@/components/TestControls";
import { Button, Card, ScreenHeader } from "@/components/ui";
import { useLongPress } from "@/components/useLongPress";
import { HOW_AI_WORKS, PRIVACY, PROTOTYPE_NOTE } from "@/lib/content";
import { actions } from "@/lib/store";

export default function MePage() {
  const router = useRouter();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const { caseStudyUrl } = useSiteConfig();
  const hold = useLongPress(() => setTestOpen(true));

  function reset() {
    actions.resetDemo();
    setResetOpen(false);
    router.push("/");
  }

  return (
    <>
      <ScreenHeader title="Me" />
      <div className="space-y-4 px-5 pb-8">
        <Card>
          <h2 className="text-headline">About the AI</h2>
          <p className="text-body mt-1 text-ink-2">{PROTOTYPE_NOTE}</p>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setHowOpen(true)}>
            How it works
          </Button>
        </Card>

        <Card>
          <h2 className="text-headline">Privacy</h2>
          <p className="text-body mt-1 text-ink-2">{PRIVACY}</p>
        </Card>

        <Card padded={false}>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="text-headline flex min-h-14 w-full items-center justify-between rounded-[var(--radius-card)] px-5 text-left"
          >
            About this prototype
            <ChevronIcon className="text-ink-2" />
          </button>
          <div className="mx-5 border-t border-line" />
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="text-headline flex min-h-14 w-full items-center justify-between rounded-[var(--radius-card)] px-5 text-left text-accent-strong"
          >
            Reset demo
          </button>
        </Card>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            {...hold}
            onClick={() => hold.consumeLongPress()}
            className="text-caption min-h-11 px-3 text-ink-2 select-none"
          >
            Ladle prototype · v0.2
          </button>
        </div>
      </div>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this prototype">
        <AboutSummary />
        <h3 className="text-headline mt-6 mb-3">Try these</h3>
        <TryThese />
        <div className="mt-6">
          <AboutLinks caseStudyUrl={caseStudyUrl} />
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setAboutOpen(false)}>
          Done
        </Button>
      </Sheet>

      <Sheet open={howOpen} onClose={() => setHowOpen(false)} title="How Ladle’s AI works">
        <p className="text-body">{PROTOTYPE_NOTE}</p>
        <ul className="text-body mt-4 space-y-3">
          {HOW_AI_WORKS.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-2" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setHowOpen(false)}>
          Done
        </Button>
      </Sheet>

      <TestControls open={testOpen} onClose={() => setTestOpen(false)} />

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo?">
        <p className="text-body">
          Start over with Maya&rsquo;s original data. Changes you made in this browser will be
          cleared.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={reset}>Reset demo</Button>
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}
