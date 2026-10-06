"use client";

// Importing a recipe (F3): "reading the recipe", then the review screen with
// clarifying questions, editable ingredients, totals and Save.

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { Button, ButtonLink, Card, ScreenHeader } from "@/components/ui";
import { ai, AIError, type ExtractInput } from "@/lib/ai";
import {
  clearDraft,
  getDraft,
  reviewFromResult,
  setDraft,
  type Answer,
  type Draft,
  type ReviewIngredient,
  type ReviewState,
} from "@/lib/draft";
import { formatNumber } from "@/lib/format";
import type { ClarifyingQuestion, ImportSource } from "@/lib/importTypes";
import { formatAmount, sumMacros } from "@/lib/logic";
import { ingredientFromLine } from "@/lib/mock-ai/extract";
import { searchIngredients } from "@/lib/mock-ai/match";
import { photoBlob, shrinkImage } from "@/lib/plate";
import { actions, useLadle } from "@/lib/store";
import type { Ingredient, Recipe } from "@/lib/types";

const READING_LINES = [
  "Reading the recipe…",
  "Measuring the ingredients…",
  "Checking the oil and sugar…",
  "Adding it all up…",
];

/* ---------- "Reading the recipe" ---------- */

function PotAnimation() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      {[34, 48, 62].map((x, i) => (
        <path
          key={x}
          d={`M${x} 34c-4-5 4-8 0-14`}
          fill="none"
          stroke="var(--rough)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ animation: `steam 1.8s ease-out ${i * 0.45}s infinite`, opacity: 0 }}
        />
      ))}
      <g style={{ animation: "bob 2.4s ease-in-out infinite" }}>
        <path d="M18 44h60v18a14 14 0 0 1-14 14H32a14 14 0 0 1-14-14z" fill="var(--accent)" />
        <rect x="14" y="40" width="68" height="7" rx="3.5" fill="var(--accent-strong)" />
        <rect x="6" y="50" width="12" height="5" rx="2.5" fill="var(--accent-strong)" />
        <rect x="78" y="50" width="12" height="5" rx="2.5" fill="var(--accent-strong)" />
      </g>
    </svg>
  );
}

/** What to send to the AI for each kind of import. */
async function inputFor(source: ImportSource): Promise<ExtractInput> {
  if (source.kind === "link") return { kind: "text", text: "", sourceUrl: source.url };
  if (source.kind === "text") return { kind: "text", text: source.text, sourceUrl: source.link };
  if (source.isExample) return { kind: "image", file: new Blob(), demoAsset: "recipe-card" };
  return { kind: "image", file: await photoBlob(source.src) };
}

function Reading({
  source,
  onDone,
  onFail,
  onCancel,
}: {
  source: ImportSource;
  onDone: (result: NonNullable<Draft["result"]>) => void;
  onFail: (message: string) => void;
  onCancel: () => void;
}) {
  const [line, setLine] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const ownPhoto = source.kind === "photo" && !source.isExample;

  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % READING_LINES.length), 1100);
    return () => clearInterval(t);
  }, []);

  // Keep the latest callbacks without restarting the reading when they change.
  const callbacks = useRef({ onDone, onFail });
  useEffect(() => {
    callbacks.current = { onDone, onFail };
  });

  useEffect(() => {
    const ctrl = new AbortController();
    inputFor(source)
      .then((input) =>
        ai.extractRecipe(input, {
          signal: ctrl.signal,
          onProgress: (f) => setProgress(Math.round(f * 100)),
        }),
      )
      .then((result) => callbacks.current.onDone(result))
      .catch((e) => {
        if (ctrl.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        callbacks.current.onFail(
          e instanceof AIError ? e.message : "Ladle couldn’t read that recipe. Try again.",
        );
      });
    return () => ctrl.abort();
  }, [source]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-12 text-center">
      <PotAnimation />
      <p className="text-title mt-6" aria-live="polite">
        {ownPhoto
          ? `Reading your recipe photo…${progress !== null ? ` ${progress}%` : ""}`
          : READING_LINES[line]}
      </p>
      <p className="text-body mt-2 text-ink-2">
        {ownPhoto
          ? "The first photo takes a little longer while Ladle gets ready."
          : "This takes a few seconds."}
      </p>
      <Button variant="secondary" className="mt-8 min-w-40" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/* ---------- Review helpers ---------- */

function middleIndex(q: ClarifyingQuestion) {
  return Math.floor(q.options.length / 2);
}

const FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75 };

/** "2 tbsp" → 2 tbsp, "¼ cup" → 0.25 cup. */
function parseAmount(label: string): { quantity: number | null; unit: string } {
  const m = label.match(/^(\d*\.?\d*)([¼½¾]?)\s*(.*)$/);
  if (!m || (!m[1] && !m[2])) return { quantity: null, unit: label };
  return { quantity: (Number(m[1]) || 0) + (FRACTIONS[m[2]] ?? 0), unit: m[3] };
}

/** The ingredient with its question's answer applied. */
function applyAnswer(
  ing: ReviewIngredient,
  q: ClarifyingQuestion | undefined,
  answer: Answer | undefined,
): ReviewIngredient {
  if (!q || answer === undefined) return ing;
  const index = answer === "unsure" ? middleIndex(q) : answer;
  const option = q.options[index];
  const fat = option.fat ?? Math.round(option.kcalDelta / 9);
  return {
    ...ing,
    ...parseAmount(option.label),
    kcal: option.kcalDelta,
    fat,
    protein: 0,
    carbs: 0,
    estimated: answer === "unsure",
  };
}

function sourceSummary(source: ImportSource): { text: string; history: string } {
  if (source.kind === "link") {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    return { text: `From a link · ${host}`, history: `Imported from a link (${host})` };
  }
  if (source.kind === "text") {
    return source.link
      ? { text: "From a pasted caption", history: "Imported from a pasted caption" }
      : { text: "From pasted text", history: "Imported from pasted text" };
  }
  return source.isExample
    ? { text: "From a photo of a recipe card", history: "Imported from a recipe card photo" }
    : { text: "From a recipe photo", history: "Imported from a recipe photo" };
}

function guessIllustration(name: string): Recipe["illustration"] {
  const n = name.toLowerCase();
  if (/(braise|stew|soup|chili|curry|dal)/.test(n)) return "pot";
  if (/(rice|noodle|bowl|oats)/.test(n)) return "bowl";
  return "plate";
}

/* ---------- Edit one ingredient ---------- */

function IngredientEditor({
  ingredient,
  linkedToQuestion,
  onSave,
  onDelete,
  onClose,
}: {
  ingredient: ReviewIngredient | null;
  linkedToQuestion: boolean;
  onSave: (i: ReviewIngredient) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ids = { qty: useId(), unit: useId(), item: useId(), kcal: useId(), food: useId() };
  const [shown, setShown] = useState(ingredient);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [item, setItem] = useState("");
  const [kcal, setKcal] = useState("");
  const [foodQuery, setFoodQuery] = useState("");
  /** A food picked from Ladle's list: calories follow the amount. */
  const [picked, setPicked] = useState<{
    name: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [prevUid, setPrevUid] = useState<string | null>(null);
  if (ingredient && ingredient.uid !== prevUid) {
    setPrevUid(ingredient.uid);
    setShown(ingredient);
    setQty(ingredient.quantity !== null ? formatAmount(ingredient.quantity) : "");
    setUnit(ingredient.unit);
    setItem(ingredient.item);
    setKcal(String(ingredient.kcal));
    setFoodQuery("");
    setPicked(null);
  }
  const current = ingredient ?? shown;
  const isNew = current?.uid.startsWith("new-") && current.item === "";
  const matches = searchIngredients(foodQuery);

  /** Works out calories for a picked food and amount (Ladle's nutrition table). */
  function estimate(name: string, amount: string, amountUnit: string) {
    const r = ingredientFromLine([amount.trim(), amountUnit.trim(), name].filter(Boolean).join(" "));
    if (r.unreadable) return;
    setPicked({ name, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat });
    setKcal(String(r.kcal));
    if (!amount.trim() && r.quantity !== null) {
      setQty(formatAmount(r.quantity));
      setUnit(r.unit);
    }
  }

  function save() {
    if (!current) return;
    const kcalNum = Math.max(0, Math.round(Number(kcal) || 0));
    const base = picked ?? current;
    const scale = base.kcal > 0 ? kcalNum / base.kcal : 0;
    const quantity = qty.trim() === "" ? null : Number(qty.replace("½", ".5").replace("¼", ".25").replace("¾", ".75"));
    onSave({
      ...current,
      quantity: quantity !== null && Number.isFinite(quantity) ? quantity : null,
      unit: unit.trim(),
      item: item.trim(),
      text: [qty.trim(), unit.trim(), item.trim()].filter(Boolean).join(" "),
      kcal: linkedToQuestion ? current.kcal : kcalNum,
      protein: linkedToQuestion ? current.protein : Math.round(base.protein * scale),
      carbs: linkedToQuestion ? current.carbs : Math.round(base.carbs * scale),
      fat: linkedToQuestion ? current.fat : Math.round(base.fat * scale),
      unreadable: false,
      ...(picked ? { estimated: false } : {}),
    });
  }

  const field =
    "text-body tabular min-h-12 w-full rounded-[var(--radius-control)] bg-surface-2 px-4";

  return (
    <Sheet
      open={ingredient !== null}
      onClose={onClose}
      title={isNew ? "Add an ingredient" : "Edit ingredient"}
    >
      {current && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          {current.unreadable && (
            <p className="text-body rounded-[var(--radius-control)] border border-estimate p-3">
              Ladle couldn&rsquo;t match &ldquo;{current.text}&rdquo;. Pick a food below, or type
              the calories.
            </p>
          )}
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <div>
              <label htmlFor={ids.qty} className="text-caption font-semibold text-ink-2">
                Amount
              </label>
              <input
                id={ids.qty}
                inputMode="decimal"
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  if (picked) estimate(picked.name, e.target.value, unit);
                }}
                className={field}
                disabled={linkedToQuestion}
              />
            </div>
            <div>
              <label htmlFor={ids.unit} className="text-caption font-semibold text-ink-2">
                Unit
              </label>
              <input
                id={ids.unit}
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  if (picked) estimate(picked.name, qty, e.target.value);
                }}
                placeholder="g, tbsp, cup"
                className={`${field} placeholder:text-ink-2`}
                disabled={linkedToQuestion}
              />
            </div>
          </div>
          <div>
            <label htmlFor={ids.item} className="text-caption font-semibold text-ink-2">
              Ingredient
            </label>
            <input
              id={ids.item}
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className={field}
              required
            />
          </div>
          {!linkedToQuestion && (
            <div>
              <label htmlFor={ids.food} className="text-caption font-semibold text-ink-2">
                Pick a food
              </label>
              <input
                id={ids.food}
                type="search"
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
                placeholder="Search, e.g. chickpeas"
                className={`${field} placeholder:text-ink-2`}
              />
              {matches.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {matches.map((e) => (
                    <li key={e.name}>
                      <button
                        type="button"
                        aria-pressed={picked?.name === e.name}
                        onClick={() => {
                          setItem(e.name);
                          setFoodQuery("");
                          estimate(e.name, qty, unit);
                        }}
                        className="text-body min-h-11 rounded-full bg-surface-2 px-4 hover:brightness-[0.97]"
                      >
                        {e.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {picked && (
                <p className="text-caption mt-1 text-ink-2" aria-live="polite">
                  Calories for {[qty, unit].filter(Boolean).join(" ") || "a typical amount"} of{" "}
                  {picked.name}, from standard nutrition data.
                </p>
              )}
            </div>
          )}
          <div>
            <label htmlFor={ids.kcal} className="text-caption font-semibold text-ink-2">
              Calories (kcal)
            </label>
            <input
              id={ids.kcal}
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value.replace(/[^\d]/g, ""))}
              className={field}
              disabled={linkedToQuestion}
            />
            {linkedToQuestion && (
              <p className="text-caption mt-1 text-ink-2">
                Set by your answer to the question above.
              </p>
            )}
          </div>
          <Button type="submit" className="mt-2 w-full" disabled={!item.trim()}>
            {isNew ? "Add ingredient" : "Save"}
          </Button>
          {!isNew && (
            <Button variant="quiet" className="w-full" onClick={onDelete}>
              Delete this line
            </Button>
          )}
        </form>
      )}
    </Sheet>
  );
}

/* ---------- Review screen ---------- */

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: ClarifyingQuestion;
  answer: Answer | undefined;
  onAnswer: (a: Answer | undefined) => void;
}) {
  const answered = answer !== undefined;
  const chosen =
    answer === undefined
      ? null
      : question.options[answer === "unsure" ? middleIndex(question) : answer];
  const chip = (active: boolean) =>
    `text-body tabular min-h-12 rounded-[var(--radius-control)] px-3 font-medium transition-colors duration-200 ${
      active ? "bg-ink text-bg" : "bg-surface-2 text-ink hover:brightness-[0.97]"
    }`;
  const servings = question.kind === "servings";
  const effect = (o: ClarifyingQuestion["options"][number]) =>
    servings ? "" : ` · +${formatNumber(o.kcalDelta)}`;

  return (
    <Card className={answered ? "" : "border-2 border-estimate"}>
      <p className="text-headline">{question.prompt}</p>
      {servings && !answered && (
        <p className="text-caption mt-1 text-ink-2">
          The recipe doesn&rsquo;t say, so Ladle guessed from the amounts.
        </p>
      )}
      {answered && chosen ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-body tabular text-ink-2">
            ✓ {answer === "unsure" ? `Not sure, so Ladle used ${chosen.label}` : chosen.label}
            {servings ? "" : ` · +${formatNumber(chosen.kcalDelta)} kcal`}
          </p>
          <button
            type="button"
            onClick={() => onAnswer(undefined)}
            className="text-headline min-h-11 shrink-0 px-2 text-accent-strong"
          >
            Change
          </button>
        </div>
      ) : (
        <div role="group" aria-label={question.prompt} className="mt-3 flex flex-wrap gap-2">
          {question.options.map((o, i) => (
            <button key={o.label} type="button" className={chip(false)} onClick={() => onAnswer(i)}>
              {o.label}
              {effect(o)}
            </button>
          ))}
          <button type="button" className={chip(false)} onClick={() => onAnswer("unsure")}>
            Not sure
          </button>
        </div>
      )}
    </Card>
  );
}

function Review({ draft, onDiscard }: { draft: Draft; onDiscard: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const result = draft.result!;
  const [review, setReview] = useState<ReviewState>(draft.review ?? reviewFromResult(result));
  const [editing, setEditing] = useState<ReviewIngredient | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const nameId = useId();

  // Keep the draft in storage so a reload doesn't lose the user's work.
  useEffect(() => {
    setDraft({ ...draft, review });
  }, [draft, review]);

  const questions = result.questions.filter(
    (q) => q.kind === "servings" || review.ingredients.some((i) => i.qid === q.id),
  );
  const questionFor = (i: ReviewIngredient) => questions.find((q) => q.id === i.qid);
  const finalIngredients = review.ingredients.map((i) =>
    applyAnswer(i, questionFor(i), i.qid ? review.answers[i.qid] : undefined),
  );
  const unanswered = questions.filter((q) => review.answers[q.id] === undefined).length;
  const toCheck = finalIngredients.filter((i) => i.unreadable).length;
  const totals = sumMacros(finalIngredients);
  const perServing = totals.kcal / Math.max(1, review.servings);
  const summary = sourceSummary(draft.source);
  const canSave = unanswered === 0 && toCheck === 0 && review.name.trim() !== "";

  const update = (patch: Partial<ReviewState>) => setReview((r) => ({ ...r, ...patch }));

  async function save() {
    const ingredients: Ingredient[] = finalIngredients.map((i) => {
      const rest = { ...i } as Partial<ReviewIngredient>;
      delete rest.uid;
      delete rest.qid;
      const ing = rest as Ingredient;
      if (i.vague && i.quantity !== null) {
        ing.text = `${i.text} (${formatAmount(i.quantity)} ${i.unit})`;
      }
      return ing;
    });
    const source =
      draft.source.kind === "link"
        ? draft.source.url
        : draft.source.kind === "text"
          ? (draft.source.link ?? "Pasted text")
          : draft.source.isExample
            ? "Recipe card photo"
            : "Recipe photo";
    // Keep a small copy of the user's own photo with the recipe (it's stored on this device).
    let photo: Recipe["photo"] = null;
    if (draft.source.kind === "photo") {
      const { src, alt, isExample } = draft.source;
      photo = { src: isExample ? src : await shrinkImage(src, 800).catch(() => src), alt };
    }
    const id = actions.saveRecipe({
      name: review.name.trim(),
      servings: review.servings,
      ingredients,
      source,
      photo,
      illustration: guessIllustration(review.name),
      cuisine: null,
      historyNote: summary.history,
    });
    clearDraft();
    toast({ message: "Nice, that’s saved. Ladle will remember this recipe." });
    router.replace(`/recipes/${id}`);
  }

  return (
    <>
      <ScreenHeader
        title="Review recipe"
        subtitle={summary.text}
        leading={
          <button
            type="button"
            onClick={() => setDiscardOpen(true)}
            className="text-headline inline-flex min-h-11 items-center rounded-lg px-2 text-accent-strong"
          >
            Cancel
          </button>
        }
      />

      <div className="space-y-4 px-5 pb-6">
        {draft.source.kind === "photo" && (
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            className="block w-full overflow-hidden rounded-[var(--radius-card)]"
            aria-label="View the recipe card photo larger"
          >
            <Image
              src={draft.source.src}
              alt={draft.source.alt}
              width={1200}
              height={860}
              unoptimized={!draft.source.isExample}
              className="h-auto w-full"
              priority
            />
          </button>
        )}

        {result.notice && (
          <p role="status" className="text-body rounded-[var(--radius-card)] border-2 border-estimate p-4">
            {result.notice}
          </p>
        )}

        <Card className="space-y-4">
          <div>
            <label htmlFor={nameId} className="text-caption font-semibold text-ink-2">
              Recipe name
            </label>
            <input
              id={nameId}
              value={review.name}
              onChange={(e) => update({ name: e.target.value })}
              className="text-headline mt-1 min-h-12 w-full rounded-[var(--radius-control)] bg-surface-2 px-4"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-headline">Servings</p>
              <p className="text-caption text-ink-2">
                {result.servingsConfidence === "stated"
                  ? "As written in the recipe"
                  : review.answers.servings !== undefined
                    ? "Your answer"
                    : "Ladle’s guess"}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1">
              <button
                type="button"
                aria-label="Fewer servings"
                disabled={review.servings <= 1}
                onClick={() => update({ servings: review.servings - 1 })}
                className="text-title flex size-11 items-center justify-center rounded-[10px] bg-surface disabled:opacity-40"
              >
                −
              </button>
              <span className="text-headline tabular w-8 text-center" aria-live="polite">
                {review.servings}
              </span>
              <button
                type="button"
                aria-label="More servings"
                disabled={review.servings >= 24}
                onClick={() => update({ servings: review.servings + 1 })}
                className="text-title flex size-11 items-center justify-center rounded-[10px] bg-surface disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </Card>

        {questions.length > 0 && (
          <section aria-label="Questions" className="space-y-3">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answer={review.answers[q.id]}
                onAnswer={(a) => {
                  const answers = { ...review.answers };
                  if (a === undefined) delete answers[q.id];
                  else answers[q.id] = a;
                  // A servings answer sets the servings (the stepper can still change them).
                  const picked =
                    q.kind === "servings" && a !== undefined
                      ? q.options[a === "unsure" ? middleIndex(q) : a].servings
                      : undefined;
                  update(picked ? { answers, servings: picked } : { answers });
                }}
              />
            ))}
          </section>
        )}

        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="text-title mt-2 mb-2">
            Ingredients
          </h2>
          <Card padded={false} className="px-5 py-1">
            <ul className="divide-y divide-line">
              {finalIngredients.map((i, index) => {
                const raw = review.ingredients[index];
                const waiting = i.qid !== undefined && review.answers[i.qid] === undefined;
                return (
                  <li
                    key={i.uid}
                    className={
                      i.unreadable
                        ? "-mx-3 my-2 rounded-[var(--radius-control)] border-2 border-estimate px-3"
                        : ""
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setEditing(raw)}
                      className="flex min-h-14 w-full items-center gap-3 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-body block">
                          {i.text}
                          {i.vague && !waiting && i.quantity !== null && i.qid && (
                            <span className="text-ink-2">
                              {" "}
                              · {formatAmount(i.quantity)} {i.unit}
                            </span>
                          )}
                        </span>
                        {i.unreadable && (
                          <span className="text-caption font-semibold text-estimate-ink">
                            Check this line
                          </span>
                        )}
                        {waiting && (
                          <span className="text-caption text-ink-2">Answer the question above</span>
                        )}
                        {i.estimated && (
                          <span className="text-caption text-estimate-ink">
                            {i.qid
                              ? "Estimate (not sure)"
                              : `Estimate: Ladle used ${i.quantity !== null ? `${formatAmount(i.quantity)} ${i.unit}`.trim() : "a typical amount"}`}
                          </span>
                        )}
                      </span>
                      <span className="text-body tabular shrink-0">
                        {waiting ? "?" : formatNumber(i.kcal)}
                      </span>
                    </button>
                    {i.unreadable && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            ingredients: review.ingredients.map((x) =>
                              x.uid === i.uid ? { ...x, unreadable: false } : x,
                            ),
                          })
                        }
                        className="text-headline mb-2 min-h-11 rounded-lg px-1 text-accent-strong"
                      >
                        ✓ Looks right
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() =>
                setEditing({
                  uid: `new-${Date.now()}`,
                  text: "",
                  quantity: null,
                  unit: "",
                  item: "",
                  kcal: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                })
              }
              className="text-headline flex min-h-12 items-center gap-2 border-t border-line py-2 text-accent-strong"
              style={{ width: "100%" }}
            >
              <PlusIcon width={20} height={20} /> Add ingredient
            </button>
          </Card>
          <p className="text-caption mt-2 text-ink-2">
            Calories are estimates based on standard nutrition data. Tap a line to change it.
          </p>
        </section>
      </div>

      {/* Totals and Save stay visible at the bottom of the screen. */}
      <div
        className="sticky bottom-0 z-10 border-t border-line bg-bg/95 px-5 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}
      >
        <div className="flex items-baseline justify-between">
          <p className="text-headline tabular">
            {formatNumber(totals.kcal)} kcal total
            {unanswered > 0 && <span className="text-caption text-ink-2"> (so far)</span>}
          </p>
          <p className="text-body tabular text-ink-2">{formatNumber(perServing)} per serving</p>
        </div>
        <Button className="mt-2 w-full" disabled={!canSave} onClick={() => void save()}>
          Save recipe
        </Button>
        {!canSave && (
          <p className="text-caption mt-1 text-center text-ink-2" aria-live="polite">
            {unanswered > 0
              ? `Answer ${unanswered === 1 ? "the question" : `${unanswered} questions`} to save.`
              : toCheck > 0
                ? `Check ${toCheck === 1 ? "the highlighted line" : `${toCheck} highlighted lines`} to save.`
                : "Give the recipe a name to save."}
          </p>
        )}
      </div>

      <IngredientEditor
        ingredient={editing}
        linkedToQuestion={editing?.qid !== undefined}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          const exists = review.ingredients.some((x) => x.uid === next.uid);
          update({
            ingredients: exists
              ? review.ingredients.map((x) => (x.uid === next.uid ? next : x))
              : [...review.ingredients, next],
          });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          update({ ingredients: review.ingredients.filter((x) => x.uid !== editing.uid) });
          setEditing(null);
        }}
      />

      {draft.source.kind === "photo" && (
        <Sheet
          open={photoOpen}
          onClose={() => setPhotoOpen(false)}
          title={draft.source.isExample ? "Recipe card" : "Recipe photo"}
        >
          <Image
            src={draft.source.src}
            alt={draft.source.alt}
            width={1200}
            height={860}
            unoptimized={!draft.source.isExample}
            className="h-auto w-full rounded-[var(--radius-control)]"
          />
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setPhotoOpen(false)}>
            Done
          </Button>
        </Sheet>
      )}

      <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard this recipe?">
        <p className="text-body">Ladle won&rsquo;t save it. You can import it again any time.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onDiscard}>Discard</Button>
          <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
            Keep editing
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/* ---------- The page ---------- */

/** A photo Ladle couldn't read well: show it beside the text it read, to fix by hand. */
function FixPhotoText({
  draft,
  onRead,
  onCancel,
}: {
  draft: Draft;
  onRead: (result: NonNullable<Draft["result"]>) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(draft.result?.readText ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textId = useId();
  const photo = draft.source.kind === "photo" ? draft.source : null;

  async function read() {
    setBusy(true);
    setError(null);
    try {
      onRead(await ai.extractRecipe({ kind: "text", text }));
    } catch (e) {
      setError(e instanceof AIError ? e.message : "Ladle couldn’t read that. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <ScreenHeader
        title="Check the text"
        subtitle="I couldn’t read all of this. Type or fix the lines you see, and I’ll do the rest."
        leading={
          <button
            type="button"
            onClick={onCancel}
            className="text-headline inline-flex min-h-11 items-center rounded-lg px-2 text-accent-strong"
          >
            Cancel
          </button>
        }
      />
      <form
        noValidate
        className="space-y-4 px-5 pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void read();
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- a local photo (data URL)
          <img src={photo.src} alt={photo.alt} className="h-auto w-full rounded-[var(--radius-card)]" />
        )}
        <div>
          <label htmlFor={textId} className="text-headline">
            Recipe text
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder={"One ingredient per line, e.g.\n2 tbsp soy sauce"}
            className="text-body mt-2 w-full rounded-[var(--radius-control)] bg-surface-2 p-4 placeholder:text-ink-2"
          />
        </div>
        {error && (
          <p role="alert" className="text-body rounded-[var(--radius-control)] bg-surface-2 p-4">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={!text.trim() || busy}>
          {busy ? "Reading…" : "Read these lines"}
        </Button>
      </form>
    </>
  );
}

function ImportFlow() {
  const router = useRouter();
  const [draft, setDraftState] = useState<Draft | null>(() => getDraft());
  const [failed, setFailed] = useState<string | null>(null);

  const leave = () => {
    clearDraft();
    router.replace("/recipes");
  };

  const store = (result: NonNullable<Draft["result"]>) => {
    if (!draft) return;
    const next: Draft = {
      ...draft,
      result,
      review: result.lowConfidence ? null : reviewFromResult(result),
    };
    setDraft(next);
    setDraftState(next);
  };

  if (!draft) {
    return (
      <>
        <ScreenHeader title="Add a recipe" />
        <div className="px-5">
          <Card>
            <p className="text-body">There&rsquo;s no recipe being imported right now.</p>
            <ButtonLink href="/recipes" variant="secondary" className="mt-4 w-full">
              Back to Recipes
            </ButtonLink>
          </Card>
        </div>
      </>
    );
  }

  if (failed) {
    return (
      <>
        <ScreenHeader title="Add a recipe" />
        <div className="px-5">
          <Card>
            <p role="alert" className="text-body">
              {failed}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => setFailed(null)}>Try again</Button>
              <Button variant="secondary" onClick={leave}>
                Back to Recipes
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (!draft.result) {
    return <Reading source={draft.source} onDone={store} onFail={setFailed} onCancel={leave} />;
  }

  if (draft.result.lowConfidence) {
    return <FixPhotoText draft={draft} onRead={store} onCancel={leave} />;
  }

  return <Review draft={draft} onDiscard={leave} />;
}

export default function NewRecipePage() {
  // Wait until the page is in the browser (where the draft is stored).
  const state = useLadle();
  if (!state) return null;
  return <ImportFlow />;
}
