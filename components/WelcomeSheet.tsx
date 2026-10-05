"use client";

// Shown once on a visitor's first visit. Dismissing it is remembered in the browser.

import { DISCLAIMER, PRIVACY } from "@/lib/content";
import { actions, useLadle } from "@/lib/store";
import { Sheet } from "./Sheet";
import { Button, ExternalButton } from "./ui";

export function WelcomeSheet({ caseStudyUrl }: { caseStudyUrl: string }) {
  const state = useLadle();
  const open = state !== null && !state.prefs.welcomeDismissed;

  return (
    <Sheet open={open} onClose={actions.dismissWelcome} title="Welcome to Ladle">
      <p className="text-body">
        Ladle is a design prototype from my UX case study. You&rsquo;re Maya, a home cook. Try
        importing a recipe, logging your plate, or fixing a log.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={actions.dismissWelcome}>Start exploring</Button>
        {caseStudyUrl && (
          <ExternalButton variant="secondary" href={caseStudyUrl} onClick={actions.dismissWelcome}>
            Read the case study
          </ExternalButton>
        )}
      </div>
      <p className="text-caption mt-5 text-ink-2">{DISCLAIMER}</p>
      <p className="text-caption mt-2 text-ink-2">{PRIVACY}</p>
    </Sheet>
  );
}
