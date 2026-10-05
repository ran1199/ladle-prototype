"use client";

// Me tab: mode, privacy, about this prototype, and Reset demo.
// Access codes (Milestone 6), daily target and data export (later) build on this.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AboutLinks, AboutSummary, TryThese } from "@/components/AboutContent";
import { ChevronIcon } from "@/components/icons";
import { Sheet } from "@/components/Sheet";
import { useSiteConfig } from "@/components/SiteConfig";
import { Button, Card, ScreenHeader } from "@/components/ui";
import { PRIVACY } from "@/lib/content";
import { actions, useLadle } from "@/lib/store";

export default function MePage() {
  const state = useLadle();
  const router = useRouter();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const { caseStudyUrl } = useSiteConfig();
  const live = state?.prefs.mode === "live";

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
          <h2 className="text-headline">Mode</h2>
          <p className="text-body mt-1 text-ink-2">
            {live
              ? "Live AI: Ladle analyses your own recipes and photos."
              : "Demo: scripted examples, the same for every visitor. Free and instant."}
          </p>
          <Button variant="secondary" className="mt-4 w-full" disabled>
            I have an access code
          </Button>
          <p className="text-caption mt-2 text-ink-2">Live AI arrives in a later milestone.</p>
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

        <p className="text-caption pt-2 text-center text-ink-2">Ladle prototype · v0.1</p>
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
