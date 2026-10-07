// Usability session recorder: task success, targets and the CSV file.

import { expect, test } from "vitest";
import {
  applyEvent,
  csvCell,
  CSV_COLUMNS,
  targetMet,
  toCSV,
  type Session,
  type TaskId,
  type TaskRecord,
} from "@/lib/sessions";

function task(id: TaskId, seconds: number, changes: Partial<TaskRecord> = {}): TaskRecord {
  const start = new Date("2026-10-07T18:00:00");
  return {
    task: id,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + seconds * 1000).toISOString(),
    taps: 0,
    edits: 0,
    wrongTurns: 0,
    completed: true,
    endedByModerator: false,
    acceptedEstimate: null,
    choiceDetails: "",
    note: "",
    ...changes,
  };
}

test("CSV cells: commas, quotes and line breaks are quoted; formulas are defused", () => {
  expect(csvCell("plain")).toBe("plain");
  expect(csvCell("Oil: 2 tbsp, then saved")).toBe('"Oil: 2 tbsp, then saved"');
  expect(csvCell('She said "where?"')).toBe('"She said ""where?"""');
  expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  expect(csvCell("-hesitated")).toBe("'-hesitated");
  expect(csvCell(" padded")).toBe('" padded"');
  expect(csvCell(null)).toBe("");
  expect(csvCell(12)).toBe("12");
});

test("targets", () => {
  expect(targetMet(task("T1", 95))).toBe(true);
  expect(targetMet(task("T1", 130))).toBe(false);
  expect(targetMet(task("T1", 60, { completed: false, endedByModerator: true }))).toBe(false);
  expect(targetMet(task("T2", 20, { taps: 3 }))).toBe(true);
  expect(targetMet(task("T2", 20, { taps: 4 }))).toBe(false);
  expect(targetMet(task("T3", 30, { choiceDetails: "Just this time" }))).toBe(true);
  expect(targetMet(task("T3", 30, { choiceDetails: "" }))).toBe(false);
  expect(targetMet(task("T4", 6, { acceptedEstimate: true }))).toBe(true);
  expect(targetMet(task("T4", 12, { acceptedEstimate: true }))).toBe(false);
  expect(targetMet(task("T4", 6, { acceptedEstimate: false }))).toBe(false);
  expect(targetMet(task("T5", 200))).toBe(true);
});

test("each task ends on its own success event", () => {
  const running = (id: TaskId) => task(id, 0, { endedAt: null, completed: false });
  const t1 = applyEvent(running("T1"), {
    type: "recipe-saved",
    recipeId: "air-fryer-garlic-chicken",
    key: "air-fryer-garlic-chicken",
    oilAnswer: "2 tbsp",
  });
  expect(t1).toMatchObject({ completed: true, choiceDetails: "Oil: 2 tbsp" });

  // Saving a different recipe doesn't end T1.
  const other = applyEvent(running("T1"), { type: "recipe-saved", recipeId: "x", key: "x" });
  expect(other.completed).toBe(false);

  const t2 = applyEvent(running("T2"), {
    type: "meal-logged",
    recipeId: "air-fryer-garlic-chicken",
    recipeKey: "air-fryer-garlic-chicken",
    via: "plate-photo",
    portion: 1,
    suggestedPortion: 1,
    acceptedEstimate: true,
  });
  expect(t2).toMatchObject({
    completed: true,
    acceptedEstimate: true,
    choiceDetails: "Portion 1 (suggested 1)",
  });

  const t3 = applyEvent(running("T3"), {
    type: "fix-applied",
    recipeKey: "air-fryer-garlic-chicken",
    kind: "more-oil",
    scope: "always",
  });
  expect(t3).toMatchObject({ completed: true, choiceDetails: "Always" });

  const t4 = applyEvent(running("T4"), {
    type: "meal-logged",
    recipeId: "chicken-adobo",
    recipeKey: "chicken-adobo",
    via: "one-tap",
    portion: 1,
  });
  expect(t4).toMatchObject({ completed: true, acceptedEstimate: true });

  const t5 = applyEvent(running("T5"), {
    type: "recipe-saved",
    recipeId: "grandma-s-braised-pork",
    key: "grandma-s-braised-pork",
  });
  expect(t5.completed).toBe(true);
});

test("taps, edits and wrong turns are counted; helpful tabs aren't wrong turns", () => {
  let t = task("T1", 0, { endedAt: null, completed: false });
  t = applyEvent(t, { type: "edit", what: "servings" });
  t = applyEvent(t, { type: "wrong-turn", what: "Back" });
  t = applyEvent(t, { type: "tab", tab: "Recipes" });
  t = applyEvent(t, { type: "tab", tab: "Pantry" });
  expect(t).toMatchObject({ edits: 1, wrongTurns: 2, completed: false });
});

test("CSV file: header, one row per task, moderator-ended tasks marked", () => {
  const session: Session = {
    id: "s1",
    participant: "P01",
    startedAt: new Date("2026-10-07T18:00:00").toISOString(),
    endedAt: null,
    tasks: [
      task("T1", 72.4, {
        taps: 9,
        choiceDetails: "Oil: 2 tbsp",
        note: 'Paused at "servings", then fine',
      }),
      task("T2", 30, { completed: false, endedByModerator: true }),
    ],
  };
  const lines = toCSV([session]).trimEnd().split("\r\n");
  expect(lines[0]).toBe(CSV_COLUMNS.join(","));
  expect(lines).toHaveLength(3);
  expect(lines[1]).toBe(
    'P01,2026-10-07,T1,18:00:00,18:01:12,72.4,9,0,0,yes,,Oil: 2 tbsp,yes,"Paused at ""servings"", then fine"',
  );
  expect(lines[2]).toContain(",no (ended by moderator),");
  expect(lines[2].endsWith(",no,")).toBe(true);
});
