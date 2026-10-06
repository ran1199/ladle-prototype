import { describe, expect, test } from "vitest";
import {
  activeBatch,
  addRecipeLog,
  isFreshBatch,
  isStaleBatch,
  logKcal,
  removeLog,
  startBatch,
  updateBatch,
} from "@/lib/logic";
import { buildSeed, recipeTotalKcal } from "@/lib/seed";

const now = new Date("2026-10-08T19:00:00");
const seed = buildSeed(now);
const dal = seed.recipes.find((r) => r.id === "lentil-dal")!; // serves 4

describe("batches", () => {
  test("a batch serving is the pot's share when the pot made a different number of servings", () => {
    const { batch } = startBatch(seed, dal.id, 8, now);
    expect(logKcal(dal, 1, batch)).toBe(Math.round(recipeTotalKcal(dal) / 8));
    const same = startBatch(seed, dal.id, 4, now).batch;
    expect(logKcal(dal, 1, same)).toBe(Math.round(recipeTotalKcal(dal) / 4));
  });

  test("starting a batch finishes the recipe's earlier batch", () => {
    const one = startBatch(seed, dal.id, 4, new Date("2026-10-01T18:00:00")).data;
    const two = startBatch(one, dal.id, 6, now);
    const dalBatches = two.data.batches.filter((b) => b.recipeId === dal.id);
    expect(dalBatches.map((b) => b.servingsLeft)).toEqual([0, 6]);
    expect(activeBatch(two.data, dal.id, now)?.id).toBe(two.batch.id);
  });

  test("logging from a batch counts it down, and deleting the log puts it back", () => {
    const { data, batch } = startBatch(seed, dal.id, 4, now);
    const logged = addRecipeLog(data, dal.id, 1.5, { batchId: batch.id, at: now });
    expect(logged.data.batches.find((b) => b.id === batch.id)?.servingsLeft).toBe(2.5);
    const undone = removeLog(logged.data, logged.log!.id);
    expect(undone.batches.find((b) => b.id === batch.id)?.servingsLeft).toBe(4);
  });

  test("fresh for 4 days, then 'Still have it?'; Yes keeps it 4 more days", () => {
    const { data, batch } = startBatch(seed, dal.id, 4, new Date("2026-10-03T18:00:00"));
    expect(isFreshBatch(batch, now)).toBe(false);
    expect(isStaleBatch(batch, now)).toBe(true);
    const kept = updateBatch(data, batch.id, { checkedAt: now.toISOString() });
    const b = kept.batches.find((x) => x.id === batch.id)!;
    expect(isFreshBatch(b, now)).toBe(true);
    expect(isStaleBatch(b, new Date("2026-10-13T20:00:00"))).toBe(true);
  });

  test("Clear empties it; the count can't go below 0 or above what the pot made", () => {
    const { data, batch } = startBatch(seed, dal.id, 4, now);
    const cleared = updateBatch(data, batch.id, { servingsLeft: 0 });
    const b = cleared.batches.find((x) => x.id === batch.id)!;
    expect(isFreshBatch(b, now) || isStaleBatch(b, now)).toBe(false);
    expect(updateBatch(data, batch.id, { servingsLeft: 9 }).batches.find((x) => x.id === batch.id)?.servingsLeft).toBe(4);
    expect(updateBatch(data, batch.id, { servingsLeft: -2 }).batches.find((x) => x.id === batch.id)?.servingsLeft).toBe(0);
  });

  test("Maya's turkey chili batch from yesterday is fresh", () => {
    const chili = seed.batches[0];
    expect(isFreshBatch(chili, now)).toBe(true);
    expect(activeBatch(seed, "turkey-chili", now)?.id).toBe(chili.id);
  });
});
