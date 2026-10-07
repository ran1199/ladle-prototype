"use client";

// "Add a recipe" sheet (F3): paste a link, paste text, or a photo of a written recipe.
// The demo link, caption and example card give the scripted results; anything
// else is read by Ladle's simulated AI.

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { checkLink, DEMO_CAPTION, DEMO_CARD } from "@/lib/ai/scripted";
import { DEMO_LINK } from "@/lib/content";
import { startDraft } from "@/lib/draft";
import { readPhotoFile } from "@/lib/plate";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

type Method = "link" | "text" | "photo";

const METHODS: { id: Method; label: string }[] = [
  { id: "link", label: "Link" },
  { id: "text", label: "Text" },
  { id: "photo", label: "Photo" },
];

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="text-body mt-3 rounded-[var(--radius-control)] bg-surface-2 p-4">
      {children}
    </div>
  );
}

export function ImportSheet({
  open,
  onClose,
  initialUrl = "",
}: {
  open: boolean;
  onClose: () => void;
  /** Prefills the link box (the 60-second tour passes the demo link). */
  initialUrl?: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("link");
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState("");
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const [notice, setNotice] = useState<React.ReactNode>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ids = { url: useId(), text: useId() };

  // Start fresh each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMethod("link");
      setUrl(initialUrl);
      setText("");
      setSavedLink(null);
      setNotice(null);
    }
  }

  function choose(m: Method) {
    setMethod(m);
    setNotice(null);
  }

  function go(source: Parameters<typeof startDraft>[0]) {
    startDraft(source);
    onClose();
    router.push("/recipes/new");
  }

  async function paste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setUrl(clip.trim());
    } catch {
      urlRef.current?.focus();
      setNotice("Ladle can’t read your clipboard here. Paste into the box instead.");
    }
  }

  function submitLink() {
    const check = checkLink(url);
    if (check.ok) return go({ kind: "link", url: check.url });
    if (check.reason === "invalid") {
      setNotice("That doesn’t look like a link. Check it and try again.");
    } else {
      // Don't open videos: switch to text, keeping the link as the source.
      setSavedLink(url.trim());
      setMethod("text");
      setNotice("Ladle can’t open videos yet. Paste the caption or the recipe text instead.");
    }
  }

  function submitText() {
    if (!text.trim()) {
      setNotice("Paste a caption or the recipe text first.");
      return;
    }
    go({ kind: "text", text, link: savedLink ?? undefined });
  }

  async function onPhotoChosen() {
    const file = fileRef.current?.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    try {
      // Text reads best at about 1,600 px; the photo stays on this device.
      const src = await readPhotoFile(file, 1600);
      go({ kind: "photo", src, alt: "Your recipe photo", isExample: false });
    } catch (err) {
      setNotice(
        err instanceof Error && err.message === "too-big"
          ? "That photo is over 10 MB. Try a smaller one."
          : "Ladle couldn’t open that file. Choose a photo instead.",
      );
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add a recipe">
      <div
        role="tablist"
        aria-label="Import from"
        className="grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1"
      >
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={method === m.id}
            onClick={() => choose(m.id)}
            className={`text-headline min-h-11 rounded-[10px] transition-colors duration-200 ${
              method === m.id ? "bg-surface text-ink shadow-sm" : "text-ink-2"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-4">
        {method === "link" && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitLink();
            }}
          >
            <label htmlFor={ids.url} className="text-headline">
              Recipe or video link
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id={ids.url}
                ref={urlRef}
                type="url"
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                className="text-body min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2"
              />
              <Button variant="secondary" className="shrink-0 px-4" onClick={paste}>
                Paste
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setUrl(DEMO_LINK)}
              className="text-caption mt-2 min-h-11 rounded-full bg-surface-2 px-4 font-semibold text-ink-2"
            >
              Use demo link
            </button>
            {notice && <Notice>{notice}</Notice>}
            <Button type="submit" className="mt-4 w-full" disabled={!url.trim()}>
              Import recipe
            </Button>
          </form>
        )}

        {method === "text" && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitText();
            }}
          >
            <label htmlFor={ids.text} className="text-headline">
              Caption or recipe text
            </label>
            {savedLink && (
              <p className="text-caption mt-1 truncate text-ink-2">Source saved: {savedLink}</p>
            )}
            <textarea
              id={ids.text}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder="Paste the ingredients here"
              className="text-body mt-2 w-full rounded-[var(--radius-control)] bg-surface-2 p-4 placeholder:text-ink-2"
            />
            <button
              type="button"
              onClick={() => {
                setText(DEMO_CAPTION);
                setNotice(null);
              }}
              className="text-caption mt-1 min-h-11 rounded-full bg-surface-2 px-4 font-semibold text-ink-2"
            >
              Use example
            </button>
            {notice && <Notice>{notice}</Notice>}
            <Button type="submit" className="mt-4 w-full" disabled={!text.trim()}>
              Read recipe
            </Button>
          </form>
        )}

        {method === "photo" && (
          <div>
            <p className="text-body text-ink-2">
              A cookbook page or a recipe card. Ladle reads each line on your phone for you to
              check. Printed recipes read best.
            </p>
            <label className="text-headline mt-4 flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--radius-control)] bg-surface-2 px-5 focus-within:outline-3 focus-within:outline-accent-strong">
              Take or choose a photo
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhotoChosen}
                className="sr-only"
              />
            </label>
            {notice && <Notice>{notice}</Notice>}
            <button
              type="button"
              onClick={() =>
                go({ kind: "photo", src: DEMO_CARD.src, alt: DEMO_CARD.alt, isExample: true })
              }
              className="mt-4 flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-line p-3 text-left hover:bg-surface-2"
            >
              <Image
                src={DEMO_CARD.src}
                alt=""
                width={96}
                height={69}
                className="shrink-0 rounded-lg"
              />
              <span>
                <span className="text-headline block">Use example card</span>
                <span className="text-caption text-ink-2">Grandma&rsquo;s braised pork</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
