import { describe, expect, it } from "vitest";
import { SCAN_BLOCK, checkCountingSort, countingSortReference, dispatchShape, scanLevels } from "./sort.js";

describe("scanLevels", () => {
  it("stops once a level fits one block", () => {
    expect(scanLevels(1)).toEqual([1]);
    expect(scanLevels(SCAN_BLOCK)).toEqual([SCAN_BLOCK]);
    expect(scanLevels(SCAN_BLOCK + 1)).toEqual([SCAN_BLOCK + 1, 2]);
    // a 2048² grid of cells plus the total slot
    expect(scanLevels(2048 * 2048 + 1)).toEqual([4194305, 4097, 5]);
  });
  it("rejects empty or fractional sizes", () => {
    expect(() => scanLevels(0)).toThrow();
    expect(() => scanLevels(2.5)).toThrow();
  });
});

describe("dispatchShape", () => {
  it("stays 1D up to the per-dimension limit", () => {
    expect(dispatchShape(1)).toEqual([1, 1]);
    expect(dispatchShape(65535)).toEqual([65535, 1]);
  });
  it("goes 2D past it and covers every group", () => {
    for (const g of [65536, 131071, 1 << 20]) {
      const [x, y] = dispatchShape(g);
      expect(x).toBeLessThanOrEqual(65535);
      expect(x * y).toBeGreaterThanOrEqual(g);
    }
  });
});

describe("countingSortReference", () => {
  it("groups items by key, stably, with the total last", () => {
    const keys = [3, 1, 3, 0, 1, 3];
    const { cellStart, order } = countingSortReference(keys, 4);
    expect([...cellStart]).toEqual([0, 1, 3, 3, 6]);
    expect([...order]).toEqual([3, 1, 4, 0, 2, 5]);
  });
  it("clamps keys past the range into the last bucket", () => {
    const { cellStart } = countingSortReference([0, 9], 2);
    expect([...cellStart]).toEqual([0, 1, 2]);
  });
});

describe("checkCountingSort", () => {
  const keys = [2, 0, 2, 1, 0];
  const ref = countingSortReference(keys, 3);
  it("accepts any order within a bucket", () => {
    // swap the two items in bucket 0 and in bucket 2
    const order = Uint32Array.from(ref.order);
    [order[0], order[1]] = [order[1]!, order[0]!];
    [order[3], order[4]] = [order[4]!, order[3]!];
    expect(checkCountingSort(keys, 3, ref.cellStart, order)).toBeNull();
  });
  it("rejects an item in the wrong bucket", () => {
    const order = Uint32Array.from(ref.order);
    [order[1], order[2]] = [order[2]!, order[1]!];
    expect(checkCountingSort(keys, 3, ref.cellStart, order)).toMatch(/bucket/);
  });
  it("rejects wrong offsets and duplicates", () => {
    const bad = Uint32Array.from(ref.cellStart);
    bad[1] = 1;
    expect(checkCountingSort(keys, 3, bad, ref.order)).toMatch(/cellStart/);
    const dup = Uint32Array.from(ref.order);
    dup[1] = dup[0]!;
    expect(checkCountingSort(keys, 3, ref.cellStart, dup)).toMatch(/duplicated|bucket/);
  });
});
