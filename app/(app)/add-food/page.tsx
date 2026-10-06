"use client";

// "Add other food" (F10): food that isn't one of your recipes.
// - Barcode: scan it (where the browser can) or type the number; the label
//   comes from Open Food Facts and always beats an estimate.
// - Search: Ladle's list of common foods with typical servings.
// - Restaurant: a rough estimate by kind of dish.

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { BarcodeScanner, canScanBarcodes } from "@/components/BarcodeScanner";
import {
  DishTypePanel,
  FoodLogPanel,
  FoodSearchPanel,
  ROUGH_NOTE,
} from "@/components/OtherFood";
import { useToast } from "@/components/Toast";
import { BackLink, Button, Card, ScreenHeader } from "@/components/ui";
import type { FoodResult } from "@/lib/ai";
import { isBarcode, type LabelFood } from "@/lib/barcode";
import { formatNumber } from "@/lib/format";
import { actions, useLadle } from "@/lib/store";
import type { Confidence } from "@/lib/types";

type Tab = "barcode" | "search" | "restaurant";

const TABS: { id: Tab; label: string }[] = [
  { id: "barcode", label: "Barcode" },
  { id: "search", label: "Search" },
  { id: "restaurant", label: "Restaurant" },
];

type Picked = {
  food: FoodResult;
  confidence: Confidence;
  eyebrow: string;
  note?: string;
  back: Tab;
};

type Lookup =
  | { state: "idle" }
  | { state: "looking"; code: string }
  | { state: "not-found"; code: string; noNutrition?: boolean }
  | { state: "error"; message: string };

function BarcodeTab({
  onFound,
  onSearch,
}: {
  onFound: (food: LabelFood) => void;
  onSearch: () => void;
}) {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [scanNote, setScanNote] = useState<string | null>(null);
  const codeId = useId();
  const canScan = canScanBarcodes();

  async function find(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!isBarcode(digits)) {
      setLookup({ state: "error", message: "A barcode number has 8 to 14 digits. Check it and try again." });
      return;
    }
    setCode(digits);
    setLookup({ state: "looking", code: digits });
    try {
      const res = await fetch(`/api/barcode?code=${digits}`);
      const data = (await res.json()) as {
        found?: boolean;
        food?: LabelFood;
        noNutrition?: boolean;
        error?: string;
      };
      if (data.found && data.food) {
        setLookup({ state: "idle" });
        onFound(data.food);
      } else if (data.error) {
        setLookup({ state: "error", message: data.error });
      } else {
        setLookup({ state: "not-found", code: digits, noNutrition: data.noNutrition });
      }
    } catch {
      setLookup({
        state: "error",
        message: "Ladle couldn’t reach the product database. Check your connection, or search instead.",
      });
    }
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onCode={(c) => {
          setScanning(false);
          void find(c);
        }}
        onStop={(message) => {
          setScanning(false);
          setScanNote(message ?? null);
        }}
      />
    );
  }

  return (
    <div>
      {canScan ? (
        <Button className="w-full" onClick={() => setScanning(true)}>
          Scan a barcode
        </Button>
      ) : (
        <p className="text-body text-ink-2">
          This browser can&rsquo;t scan barcodes. Type the number printed under the barcode.
        </p>
      )}
      {scanNote && (
        <p role="alert" className="text-body mt-3 text-ink-2">
          {scanNote}
        </p>
      )}
      <form
        noValidate
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void find(code);
        }}
      >
        <label htmlFor={codeId} className="text-headline">
          {canScan ? "Or type the barcode number" : "Barcode number"}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={codeId}
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^\d ]/g, ""));
              setLookup({ state: "idle" });
            }}
            placeholder="e.g. 3017624010701"
            className="text-body tabular min-h-12 min-w-0 flex-1 rounded-[var(--radius-control)] bg-surface-2 px-4 placeholder:text-ink-2"
          />
          <Button
            type="submit"
            variant="secondary"
            className="shrink-0 px-4"
            disabled={!code.trim() || lookup.state === "looking"}
          >
            {lookup.state === "looking" ? "…" : "Look up"}
          </Button>
        </div>
      </form>

      {lookup.state === "looking" && (
        <p className="text-body mt-3 text-ink-2" aria-live="polite">
          Looking it up in Open Food Facts…
        </p>
      )}
      {lookup.state === "error" && (
        <p role="alert" className="text-body mt-3 rounded-[var(--radius-control)] bg-surface-2 p-4">
          {lookup.message}
        </p>
      )}
      {lookup.state === "not-found" && (
        <div role="alert" className="mt-3 rounded-[var(--radius-control)] bg-surface-2 p-4">
          <p className="text-body">
            {lookup.noNutrition
              ? "Ladle found that product, but its label has no calories listed."
              : `Ladle couldn’t find ${lookup.code} in Open Food Facts.`}{" "}
            Search for the food instead?
          </p>
          <Button variant="secondary" className="mt-3 w-full" onClick={onSearch}>
            Search instead
          </Button>
        </div>
      )}
      <p className="text-caption mt-4 text-ink-2">
        Product details come from Open Food Facts, a free database anyone can add to.
      </p>
    </div>
  );
}

export default function AddFoodPage() {
  const state = useLadle();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("barcode");
  const [picked, setPicked] = useState<Picked | null>(null);
  const back = <BackLink href="/" label="Today" />;

  if (!state) return <ScreenHeader title="Add other food" leading={back} />;

  function log(p: Picked, servings: number) {
    const entry = actions.logFood({
      name: p.food.name,
      kcal: p.food.kcal * servings,
      confidence: p.confidence,
      portion: servings,
    });
    toast({
      message: `${p.food.name} logged · ${formatNumber(entry.kcal)} kcal`,
      actionLabel: "Undo",
      onAction: () => actions.deleteLog(entry.id),
    });
    router.push("/");
  }

  return (
    <>
      <ScreenHeader title="Add other food" leading={back} />
      <div className="px-5 pb-8">
        {picked ? (
          <Card>
            <FoodLogPanel
              food={picked.food}
              confidence={picked.confidence}
              eyebrow={picked.eyebrow}
              note={picked.note}
              onLog={(servings) => log(picked, servings)}
              onBack={() => {
                setTab(picked.back);
                setPicked(null);
              }}
            />
          </Card>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Add food by"
              className="grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-headline min-h-11 rounded-[10px] transition-colors duration-200 ${
                    tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-2"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Card className="mt-4">
              <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
                {tab === "barcode" && (
                  <BarcodeTab
                    onFound={(f) =>
                      setPicked({
                        food: {
                          name: f.brand ? `${f.name} (${f.brand})` : f.name,
                          servingLabel: f.servingLabel,
                          kcal: f.kcal,
                          protein: f.protein,
                          carbs: f.carbs,
                          fat: f.fat,
                        },
                        confidence: "label",
                        eyebrow: "From the label · Open Food Facts",
                        back: "barcode",
                      })
                    }
                    onSearch={() => setTab("search")}
                  />
                )}
                {tab === "search" && (
                  <FoodSearchPanel
                    autoFocus
                    onPick={(food) =>
                      setPicked({ food, confidence: "good", eyebrow: "Typical values", back: "search" })
                    }
                  />
                )}
                {tab === "restaurant" && (
                  <>
                    <p className="text-headline">What kind of dish is it?</p>
                    <p className="text-body mt-1 mb-4 text-ink-2">
                      Ladle gives a rough estimate for a typical restaurant portion.
                    </p>
                    <DishTypePanel
                      onEstimate={(food) =>
                        setPicked({
                          food,
                          confidence: "rough",
                          eyebrow: "Rough estimate",
                          note: ROUGH_NOTE,
                          back: "restaurant",
                        })
                      }
                      onOther={() => setTab("search")}
                    />
                  </>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
