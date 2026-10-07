// The "About this prototype" content: shown in the desktop side panel and,
// on phones, in Me → About this prototype.

import { DISCLAIMER, NOT_IN_PROTOTYPE, PROTOTYPE_NOTE, REPO_URL, SUMMARY } from "@/lib/content";
import { ExternalIcon } from "./icons";

export function AboutLinks({ caseStudyUrl }: { caseStudyUrl: string }) {
  const linkClass =
    "text-headline inline-flex min-h-11 items-center gap-1.5 text-accent-strong underline-offset-4 hover:underline";
  return (
    <ul className="flex flex-wrap gap-x-6">
      {caseStudyUrl && (
        <li>
          <a href={caseStudyUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Read the case study <ExternalIcon />
          </a>
        </li>
      )}
      <li>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Code on GitHub <ExternalIcon />
        </a>
      </li>
    </ul>
  );
}

/** "Not in this prototype, on purpose": what's left out, and why. */
export function NotInPrototype() {
  return (
    <section aria-labelledby="not-in-prototype" className="mt-6">
      <h3 id="not-in-prototype" className="text-headline">
        Not in this prototype, on purpose
      </h3>
      <p className="text-caption mt-1 text-ink-2">
        The usability tests focus on the core loop: importing, logging and correcting.
      </p>
      <ul className="mt-3 space-y-2">
        {NOT_IN_PROTOTYPE.map((item) => (
          <li key={item.what} className="text-body">
            <span className="font-semibold">{item.what}:</span>{" "}
            <span className="text-ink-2">{item.why}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AboutSummary() {
  return (
    <>
      <p className="text-body">{SUMMARY}</p>
      <p className="text-body mt-3">{PROTOTYPE_NOTE}</p>
      <p className="text-caption mt-3 text-ink-2">{DISCLAIMER}</p>
    </>
  );
}
