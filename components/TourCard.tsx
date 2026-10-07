"use client";

// "Try Ladle in 60 seconds": an inline, dismissible card on Today (not a
// pop-up) with the three steps of Ladle's core loop. Each step shows "Done"
// once it has really been done in the app. × hides it; Me → About this
// prototype → "Show the 60-second tour" brings it back.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_LINK } from "@/lib/content";
import { actions } from "@/lib/store";
import { useTestFlags } from "@/lib/testControls";
import { tourProgress } from "@/lib/tour";
import type { AppData, LogEntry, Prefs } from "@/lib/types";
import { ChevronIcon, CloseIcon, ExternalIcon } from "./icons";
import { ImportSheet } from "./ImportSheet";
import { useSiteConfig } from "./SiteConfig";
import { Button, Card } from "./ui";

function Step({
  n,
  label,
  line,
  done,
  onClick,
}: {
  n: number;
  label: string;
  line: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Step ${n}: ${label}. ${line}${done ? " Done." : ""}`}
        className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] py-2 text-left hover:bg-surface-2/60"
      >
        <span
          aria-hidden="true"
          className={`text-headline flex size-8 shrink-0 items-center justify-center rounded-full ${
            done ? "bg-confirmed text-surface" : "bg-surface-2 text-ink"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-headline block">{label}</span>
          <span className="text-caption block text-ink-2">{line}</span>
        </span>
        {done ? (
          <span className="text-caption shrink-0 font-semibold text-confirmed">Done</span>
        ) : (
          <ChevronIcon aria-hidden="true" className="shrink-0 text-ink-2" />
        )}
      </button>
    </li>
  );
}

export function TourCard({
  data,
  prefs,
  onOpenLog,
}: {
  data: AppData;
  prefs: Prefs;
  /** Opens a meal's details with "Today was different?" in view. */
  onOpenLog: (log: LogEntry) => void;
}) {
  const router = useRouter();
  const flags = useTestFlags();
  const { caseStudyUrl } = useSiteConfig();
  const [importOpen, setImportOpen] = useState(false);

  if (prefs.tourDismissed || flags.hideTour) return null;

  const { recipe, plateLog, mealToFix, fixed } = tourProgress(data);
  const allDone = !!recipe && !!plateLog && fixed;
  const toCamera = () => router.push("/camera?tour=1");
  const close = () => actions.setTourDismissed(true);

  return (
    <Card>
      <section aria-labelledby="tour-heading">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="tour-heading" className="text-headline">
              Try Ladle in 60 seconds
            </h2>
            {!allDone && (
              <p className="text-caption mt-0.5 text-ink-2">
                You&rsquo;re Maya, a home cook. Three steps show how Ladle works.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close the 60-second tour"
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        {allDone ? (
          <>
            <p className="text-body mt-1">
              That&rsquo;s the core loop. The rest is yours to explore.
            </p>
            {caseStudyUrl && (
              <a
                href={caseStudyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-headline mt-1 inline-flex min-h-11 items-center gap-1.5 text-accent-strong"
              >
                Read the case study <ExternalIcon />
              </a>
            )}
            <Button variant="secondary" className="mt-3 w-full" onClick={close}>
              Close
            </Button>
          </>
        ) : (
          <ol className="mt-2 divide-y divide-line">
            <Step
              n={1}
              label="Import a recipe"
              line="Turn a cooking video into a recipe."
              done={!!recipe}
              onClick={() => (recipe ? router.push(`/recipes/${recipe.id}`) : setImportOpen(true))}
            />
            <Step
              n={2}
              label="Snap your plate"
              line={recipe ? "Ladle works out your share." : "Import the recipe first."}
              done={!!plateLog}
              onClick={() => (recipe ? toCamera() : setImportOpen(true))}
            />
            <Step
              n={3}
              label="Fix a log"
              line={mealToFix ? "Brushed on more oil? Ladle remembers." : "Snap your plate first."}
              done={fixed}
              onClick={() =>
                mealToFix ? onOpenLog(mealToFix) : recipe ? toCamera() : setImportOpen(true)
              }
            />
          </ol>
        )}
      </section>
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} initialUrl={DEMO_LINK} />
    </Card>
  );
}
