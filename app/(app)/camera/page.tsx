"use client";

// Plate camera and photo log (F5, F8; task T2).
// Capture → (photo + draft saved locally) → "Looking at your plate…" → result:
// "Looks like Garlic chicken stir-fry", portion chips, calories, confidence, Log it.
// Ingredients always come from the recipe; the photo only measures the share.

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { DishIllustration } from "@/components/DishIllustration";
import { CameraIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { ModeBadge } from "@/components/ModeBadge";
import { PortionPicker } from "@/components/PortionPicker";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { DEMO_LINK } from "@/lib/content";
import { DEMO_PLATE, demoAnalyzePlate, demoDelay } from "@/lib/demo";
import { startDraft } from "@/lib/draft";
import { formatNumber } from "@/lib/format";
import { formatPortion, kcalFor, recipeConfidence } from "@/lib/logic";
import {
  clearPlate,
  downscale,
  getPlate,
  newPlate,
  readPhotoFile,
  savePlate,
  type PendingPlate,
} from "@/lib/plate";
import { actions, useLadle } from "@/lib/store";
import type { Recipe } from "@/lib/types";

/* ---------- Top bar ---------- */

function TopBar({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-3"
      style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close camera"
        className={`flex size-11 items-center justify-center rounded-full ${
          dark ? "bg-white/15 text-white hover:bg-white/25" : "text-ink hover:bg-surface-2"
        }`}
      >
        <CloseIcon />
      </button>
      <ModeBadge />
    </div>
  );
}

/* ---------- Capture ---------- */

type CamState = "off" | "starting" | "live" | "unavailable" | "denied";

function Capture({
  onPhoto,
  onClose,
}: {
  onPhoto: (photo: PendingPlate["photo"]) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState<CamState>("off");
  const [error, setError] = useState<string | null>(null);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("unavailable");
      return;
    }
    setCam("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCam("live");
    } catch (e) {
      setCam(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }

  // On phones, open the camera straight away. On laptops (no rear camera) wait for a tap.
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let cancelled = false;
    if (coarse) {
      queueMicrotask(() => {
        if (!cancelled) void startCamera();
      });
    }
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const src = await downscale(video, video.videoWidth, video.videoHeight);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onPhoto({ src, alt: "Your plate photo", isSample: false });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const src = await readPhotoFile(file);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onPhoto({ src, alt: "Your plate photo", isSample: false });
    } catch (err) {
      setError(
        err instanceof Error && err.message === "too-big"
          ? "That photo is over 10 MB. Try a smaller one."
          : "Ladle couldn’t open that file. Choose a photo instead.",
      );
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#14110e] text-white">
      <TopBar onClose={onClose} dark />

      <div className="relative mx-3 mt-3 flex-1 overflow-hidden rounded-[var(--radius-card)] bg-black/60">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera viewfinder"
          className={`absolute inset-0 h-full w-full object-cover ${cam === "live" ? "" : "hidden"}`}
        />
        {cam !== "live" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <CameraIcon width={40} height={40} className="opacity-70" />
            <p className="text-body text-white/85">
              {cam === "starting"
                ? "Opening the camera…"
                : cam === "denied"
                  ? "Camera access is off. You can choose a photo instead, or allow the camera in your browser settings."
                  : cam === "unavailable"
                    ? "No camera here. Choose a photo or use the sample."
                    : "Point your camera at your plate."}
            </p>
            {cam === "off" && (
              <Button variant="secondary" onClick={startCamera}>
                Turn on camera
              </Button>
            )}
          </div>
        )}
        {/* A soft circle to help frame the plate. */}
        {cam === "live" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-dashed border-white/50"
          />
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="text-body mx-4 mt-3 rounded-[var(--radius-control)] bg-white/10 p-3"
        >
          {error}
        </p>
      )}

      <div className="px-4 pt-4" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
        <Button className="w-full" onClick={() => onPhoto({ ...DEMO_PLATE, isSample: true })}>
          Use sample photo
        </Button>
        <div className="mt-3 grid grid-cols-[1fr_76px_1fr] items-center gap-2">
          <label className="flex min-h-12 cursor-pointer items-center justify-center justify-self-start rounded-[var(--radius-control)] bg-white/12 px-2 text-[15px] font-semibold whitespace-nowrap focus-within:outline-3 focus-within:outline-white">
            Choose photo
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFile}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={shoot}
            disabled={cam !== "live"}
            aria-label="Take photo"
            className="flex size-[76px] items-center justify-center rounded-full border-4 border-white disabled:opacity-35"
          >
            <span className="size-[60px] rounded-full bg-white" />
          </button>
          <span aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Analyzing / failed ---------- */

function PhotoBackdrop({ plate }: { plate: PendingPlate }) {
  return (
    <div className="relative min-h-0 flex-1">
      <Image
        src={plate.photo.src}
        alt={plate.photo.alt}
        fill
        sizes="420px"
        unoptimized={plate.photo.src.startsWith("data:")}
        className="object-cover"
        priority
      />
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative -mt-6 max-h-[72%] overflow-y-auto rounded-t-[var(--radius-card)] bg-surface px-5 pt-5 shadow-float"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
    >
      {children}
    </div>
  );
}

/* ---------- Result ---------- */

function RecipePicker({
  recipes,
  first,
  onPick,
  onBack,
}: {
  recipes: Recipe[];
  first: string[];
  onPick: (r: Recipe) => void;
  onBack?: () => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const ordered = [
    ...first.map((id) => recipes.find((r) => r.id === id)).filter((r): r is Recipe => !!r),
    ...recipes.filter((r) => !first.includes(r.id)),
  ].filter((r) => !query || r.name.toLowerCase().includes(query));

  return (
    <div>
      <label className="flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] bg-surface-2 px-3">
        <SearchIcon className="shrink-0 text-ink-2" width={20} height={20} />
        <span className="sr-only">Search your recipes</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your recipes"
          className="text-body min-w-0 flex-1 bg-transparent placeholder:text-ink-2 focus:outline-none"
        />
      </label>
      <ul className="mt-2 divide-y divide-line">
        {ordered.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
            >
              <DishIllustration kind={r.illustration} seed={r.id} size={40} />
              <span className="text-headline min-w-0 flex-1">{r.name}</span>
              <span className="text-caption tabular text-ink-2">
                {formatNumber(kcalFor(r, 1))} / serving
              </span>
            </button>
          </li>
        ))}
        {ordered.length === 0 && <li className="text-body py-4 text-ink-2">No recipes match.</li>}
      </ul>
      {onBack && (
        <Button variant="quiet" className="mt-2 w-full" onClick={onBack}>
          Back
        </Button>
      )}
    </div>
  );
}

function Result({ plate, recipes }: { plate: PendingPlate; recipes: Recipe[] }) {
  const router = useRouter();
  const toast = useToast();
  const result = plate.result;
  const suggested = recipes.find((r) => r.id === result?.matchRecipeId) ?? null;
  const [recipe, setRecipe] = useState<Recipe | null>(suggested);
  const [picked, setPicked] = useState(false);
  const [portion, setPortion] = useState(result?.portionServings ?? 1);
  const [mode, setMode] = useState<"main" | "pick" | "new">(
    suggested ? "main" : result?.isNewFood ? "new" : "pick",
  );
  const [fixesOpen, setFixesOpen] = useState(false);

  function finish(message: string, logId: string) {
    clearPlate();
    toast({ message, actionLabel: "Undo", onAction: () => actions.deleteLog(logId) });
    router.push("/");
  }

  function logIt() {
    if (!recipe) return;
    const log = actions.logRecipe(recipe.id, portion);
    if (log) finish(`Nice, that’s logged · ${formatNumber(log.kcal)} kcal`, log.id);
  }

  function logRough() {
    if (!result?.roughGuess) return;
    const log = actions.logFood({ ...result.roughGuess, confidence: "rough" });
    finish(`Logged as a rough estimate · ${formatNumber(log.kcal)} kcal`, log.id);
  }

  function importRecipe() {
    // Keep the photo saved: after importing, Today offers to finish logging it.
    startDraft({ kind: "link", url: DEMO_LINK });
    router.push("/recipes/new");
  }

  if (mode === "pick") {
    return (
      <Panel>
        <h1 className="text-title">Which recipe is this?</h1>
        {!result && (
          <p className="text-body mt-1 text-ink-2">
            Ladle analyzes your own photos in Live AI mode. In Demo mode, pick the recipe and your
            portion.
          </p>
        )}
        <div className="mt-4">
          <RecipePicker
            recipes={recipes}
            first={[
              ...(result?.matchRecipeId ? [result.matchRecipeId] : []),
              ...(result?.alternatives ?? []),
            ]}
            onPick={(r) => {
              setRecipe(r);
              setPicked(true);
              setPortion(r.usualPortion);
              setMode("main");
            }}
            onBack={recipe ? () => setMode("main") : undefined}
          />
        </div>
        {result?.roughGuess && (
          <Button variant="quiet" className="mt-1 w-full" onClick={() => setMode("new")}>
            It&rsquo;s something new
          </Button>
        )}
      </Panel>
    );
  }

  if (mode === "new" || !recipe) {
    return (
      <Panel>
        {result?.suggestImport ? (
          <>
            <h1 className="text-title">Looks like garlic chicken stir-fry</h1>
            <p className="text-body mt-1 text-ink-2">
              It isn&rsquo;t in your recipes yet. Import it once, and Ladle can measure your share
              from the recipe.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-title">Something new</h1>
            <p className="text-body mt-1 text-ink-2">
              Log a rough estimate from the photo, or import the recipe for a better number.
            </p>
          </>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {result?.roughGuess ? (
            <Button variant={result.suggestImport ? "secondary" : "primary"} onClick={logRough}>
              Log as a rough estimate · {formatNumber(result.roughGuess.kcal)} kcal
            </Button>
          ) : (
            <p className="text-caption text-ink-2">
              Rough estimates of your own photos need Live AI.
            </p>
          )}
          {result?.suggestImport ? (
            <Button className="order-first" onClick={importRecipe}>
              Import the recipe
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => router.push("/recipes")}>
              Import a recipe
            </Button>
          )}
          <Button variant="quiet" onClick={() => setMode("pick")}>
            Pick one of my recipes
          </Button>
        </div>
        {result?.roughGuess && (
          <div className="mt-3 flex justify-center">
            <ConfidenceIndicator level="rough" />
          </div>
        )}
      </Panel>
    );
  }

  const kcal = kcalFor(recipe, portion);
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <DishIllustration kind={recipe.illustration} seed={recipe.id} size={48} />
        <div className="min-w-0">
          <p className="text-caption text-ink-2">{picked ? "You picked" : "Looks like"}</p>
          <h1 className="text-title">{recipe.name}</h1>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4">
        <button
          type="button"
          onClick={() => setMode("pick")}
          className="text-caption min-h-10 font-semibold text-accent-strong"
        >
          Not this? Pick another
        </button>
        {result?.roughGuess && (
          <button
            type="button"
            onClick={() => setMode("new")}
            className="text-caption min-h-10 font-semibold text-accent-strong"
          >
            It&rsquo;s something new
          </button>
        )}
      </div>

      <p className="text-headline mt-3">
        {picked || !result
          ? "How much did you have?"
          : `Looks like about ${formatPortion(result.portionServings)}`}
      </p>
      {!picked && result && <p className="text-caption text-ink-2">{result.portionReason}</p>}
      <div className="mt-2">
        <PortionPicker value={portion} onChange={setPortion} kcalPerServing={kcalFor(recipe, 1)} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-display tabular text-[34px] leading-10 font-semibold">
          {formatNumber(kcal)} <span className="text-title">kcal</span>
        </p>
        <ConfidenceIndicator level={recipeConfidence(recipe)} recipe={recipe} />
      </div>

      <Button className="mt-4 w-full" onClick={logIt}>
        Log it
      </Button>
      <button
        type="button"
        onClick={() => setFixesOpen(true)}
        className="text-headline mt-1 min-h-11 w-full text-accent-strong"
      >
        Today was different?
      </button>

      <Sheet open={fixesOpen} onClose={() => setFixesOpen(false)} title="Today was different?">
        <p className="text-body">
          Quick fixes like &ldquo;more oil&rdquo; or &ldquo;halved the batch&rdquo; arrive in
          Milestone 5. For now, adjust the portion.
        </p>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setFixesOpen(false)}>
          OK
        </Button>
      </Sheet>
    </Panel>
  );
}

/* ---------- The page ---------- */

function PlateFlow({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const [plate, setPlate] = useState<PendingPlate | null>(() => {
    const saved = getPlate();
    // A saved photo waiting for the stir-fry import: analyze again now the recipe may exist.
    if (saved?.status === "ready" && saved.result?.suggestImport) {
      return { ...saved, status: "analyzing", result: null };
    }
    return saved;
  });

  const update = (next: PendingPlate | null) => {
    if (next) savePlate(next);
    else clearPlate();
    setPlate(next);
  };

  // Analyze (Demo: scripted, after a realistic pause). The photo is already saved.
  const analyzing = plate?.status === "analyzing" ? plate : null;
  useEffect(() => {
    if (!analyzing) return;
    const ctrl = new AbortController();
    demoDelay(ctrl.signal)
      .then(() => {
        const result = demoAnalyzePlate(analyzing.photo.isSample, recipes);
        const next: PendingPlate = { ...analyzing, status: "ready", result };
        savePlate(next);
        setPlate(next);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const next: PendingPlate = { ...analyzing, status: "failed" };
        savePlate(next);
        setPlate(next);
      });
    return () => ctrl.abort();
    // Re-run only when a new analysis starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing?.id, analyzing?.status]);

  const close = () => router.push("/");

  if (!plate) {
    return <Capture onClose={close} onPhoto={(photo) => setPlate(newPlate(photo))} />;
  }

  return (
    <div className="relative flex h-full flex-col bg-[#14110e]">
      <div className="absolute inset-x-0 top-0 z-10">
        <TopBar onClose={close} dark />
      </div>
      <PhotoBackdrop plate={plate} />
      {plate.status === "analyzing" && (
        <Panel>
          <div className="flex flex-col items-center py-4 text-center" aria-live="polite">
            <span
              aria-hidden="true"
              className="size-10 rounded-full border-4 border-surface-2 border-t-accent"
              style={{ animation: "spin 0.9s linear infinite" }}
            />
            <p className="text-title mt-4">Looking at your plate…</p>
            <p className="text-body mt-1 text-ink-2">Your photo is saved on this device.</p>
            <Button variant="secondary" className="mt-5 min-w-40" onClick={() => update(null)}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}
      {plate.status === "failed" && (
        <Panel>
          <h1 className="text-title">Ladle couldn&rsquo;t look at your plate</h1>
          <p className="text-body mt-1 text-ink-2">
            Your photo is saved. Check your connection and try again.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => update({ ...plate, status: "analyzing" })}>Retry</Button>
            <Button variant="secondary" onClick={() => update(null)}>
              Retake photo
            </Button>
          </div>
        </Panel>
      )}
      {plate.status === "ready" && <Result key={plate.id} plate={plate} recipes={recipes} />}
    </div>
  );
}

export default function CameraPage() {
  const state = useLadle();
  if (!state) return <div className="h-full bg-[#14110e]" />;
  return <PlateFlow recipes={state.data.recipes} />;
}
