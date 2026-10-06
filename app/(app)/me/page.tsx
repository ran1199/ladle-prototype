"use client";

// Me tab: your profile and daily target, how the simulated AI works, privacy,
// your data (export, reset, delete) and about this prototype.
// Pressing and holding the version line opens the hidden test controls.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AboutLinks, AboutSummary } from "@/components/AboutContent";
import { ChevronIcon } from "@/components/icons";
import { ProfileSheet } from "@/components/ProfileSheet";
import { Sheet } from "@/components/Sheet";
import { useSiteConfig } from "@/components/SiteConfig";
import { TestControls } from "@/components/TestControls";
import { useToast } from "@/components/Toast";
import { Button, Card, ScreenHeader } from "@/components/ui";
import { useLongPress } from "@/components/useLongPress";
import { HOW_AI_WORKS, PRIVACY, PROTOTYPE_NOTE } from "@/lib/content";
import { formatNumber } from "@/lib/format";
import { LB_PER_KG } from "@/lib/profile";
import { actions, exportData, useLadle } from "@/lib/store";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <dt className="text-body text-ink-2">{label}</dt>
      <dd className="text-headline tabular text-right">{value}</dd>
    </div>
  );
}

/** Saves the data as a .json file the user can keep. */
function downloadExport() {
  const blob = new Blob([exportData()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ladle-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MePage() {
  const state = useLadle();
  const router = useRouter();
  const toast = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const { caseStudyUrl } = useSiteConfig();
  const hold = useLongPress(() => setTestOpen(true));

  if (!state) return <ScreenHeader title="Me" />;
  const { profile } = state.data;

  function reset() {
    actions.resetDemo();
    setResetOpen(false);
    router.push("/");
  }

  function deleteAll() {
    actions.deleteAllData();
    setDeleteOpen(false);
    toast({ message: "All data deleted from this browser." });
  }

  const weight = profile.startingWeightKg
    ? `${formatNumber(profile.startingWeightKg)} kg · ${formatNumber(profile.startingWeightKg * LB_PER_KG)} lb`
    : "Not set";

  return (
    <>
      <ScreenHeader title="Me" />
      <div className="space-y-4 px-5 pb-8">
        <Card>
          <h2 className="text-headline">Your profile</h2>
          <dl className="mt-1 divide-y divide-line">
            <Row label="Daily target" value={`${formatNumber(profile.dailyTarget)} kcal`} />
            <Row label="Name" value={profile.name || "Not set"} />
            <Row label="Starting weight" value={weight} />
          </dl>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setProfileOpen(true)}>
            Edit profile
          </Button>
        </Card>

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
          <h2 className="text-headline px-5 pt-5">Your data</h2>
          <p className="text-caption px-5 text-ink-2">Kept in this browser only.</p>
          <button
            type="button"
            onClick={downloadExport}
            className="text-headline mt-2 flex min-h-14 w-full items-center justify-between px-5 text-left text-accent-strong"
          >
            Export my data
            <span className="text-caption font-normal text-ink-2">.json file</span>
          </button>
          <div className="mx-5 border-t border-line" />
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="text-headline flex min-h-14 w-full items-center px-5 text-left text-accent-strong"
          >
            Reset demo
          </button>
          <div className="mx-5 border-t border-line" />
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="text-headline flex min-h-14 w-full items-center rounded-b-[var(--radius-card)] px-5 text-left text-accent-strong"
          >
            Delete all data
          </button>
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
        </Card>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            {...hold}
            onClick={() => hold.consumeLongPress()}
            className="text-caption min-h-11 px-3 text-ink-2 select-none"
          >
            Ladle prototype · v1.0
          </button>
        </div>
      </div>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this prototype">
        <AboutSummary />
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

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onSave={(p) => {
          actions.updateProfile(p);
          setProfileOpen(false);
          toast({ message: "Saved." });
        }}
      />

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete all data?">
        <p className="text-body">
          Your recipes, meals and batches in this browser will be removed, and Ladle starts empty.
          This can&rsquo;t be undone. Export your data first if you&rsquo;d like a copy.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={deleteAll}>Delete all data</Button>
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </div>
        <p className="text-caption mt-3 text-ink-2">
          To try the demo again later, use Reset demo on this tab.
        </p>
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
