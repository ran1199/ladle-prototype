// The "About this prototype" content: shown in the desktop side panel and,
// on phones, in Me → About this prototype.

import { DEMO_LINK, DISCLAIMER, REPO_URL, SUMMARY, TRY_THESE } from "@/lib/content";
import { CopyChip } from "./CopyChip";
import { ExternalIcon } from "./icons";

export function TryThese() {
  return (
    <ol className="space-y-3">
      {TRY_THESE.map((task, i) => (
        <li key={task.id} className="flex gap-3">
          <span
            aria-hidden="true"
            className="text-caption tabular mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-ink-2"
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-body">{task.prompt}</p>
            {task.showDemoLink && <CopyChip text={DEMO_LINK} label="demo video link" />}
          </div>
        </li>
      ))}
    </ol>
  );
}

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

export function AboutSummary() {
  return (
    <>
      <p className="text-body">{SUMMARY}</p>
      <p className="text-caption mt-3 text-ink-2">{DISCLAIMER}</p>
    </>
  );
}
