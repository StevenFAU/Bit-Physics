import { describe, expect, it } from "vitest";
import type { SlicedJob } from "../src/v2/runtime/scheduler.js";
import { FrameScheduler } from "../src/v2/runtime/scheduler.js";

type Enc = { log: string[] };

/** A job of `total` units; records what each frame gave it. */
function job(name: string, total: number, opts: { boundary?: number; async?: boolean } = {}) {
  let done = 0;
  const slices: number[] = [];
  let release: (() => void) | null = null;
  const j: SlicedJob<Enc> & { slices: number[]; done: () => number; release: () => void } = {
    name,
    remaining: () => total - done,
    maxUnits: opts.boundary ? () => opts.boundary! - (done % opts.boundary!) : undefined,
    encode(enc, units) {
      enc.log.push(`${name}:${units}`);
      slices.push(units);
      done += units;
      return units;
    },
    afterSubmit: opts.async
      ? () =>
          new Promise<void>((r) => {
            release = r;
          })
      : undefined,
    slices,
    done: () => done,
    release: () => release?.(),
  };
  return j;
}

const frame = (s: FrameScheduler<Enc>, usedMs = 0): Enc => {
  const enc: Enc = { log: [] };
  s.encodeJobs(enc, usedMs);
  s.afterSubmit();
  return enc;
};

describe("FrameScheduler", () => {
  it("fits units to the budget from the per-unit cost", () => {
    const s = new FrameScheduler<Enc>({ budgetMs: 6, defaultUnitMs: 0.25, maxUnits: 1000 });
    expect(s.unitsFor("x", 6)).toBe(24);
    s.setCost("x", 2);
    expect(s.unitsFor("x", 6)).toBe(3);
    expect(s.unitsFor("x", 0.5)).toBe(1); // never below minUnits
    expect(s.unitsFor("x", 0.5, 0)).toBe(0);
  });

  it("learns the per-unit cost from pass timings over the units recorded", () => {
    const s = new FrameScheduler<Enc>({ budgetMs: 8 });
    s.noteUnits("train", 4);
    s.observe("train", 20); // a 19–20 ms training slice over 4 units
    expect(s.costOf("train")).toBeCloseTo(5, 6);
    // a whole training iteration (~19 ms) is longer than the budget: it is sliced
    expect(s.unitsFor("train", 8)).toBe(1);
  });

  it("gives background jobs what the foreground left, and every job progresses", () => {
    const s = new FrameScheduler<Enc>({ budgetMs: 6, defaultUnitMs: 0.5 });
    const a = job("a", 100);
    const b = job("b", 100);
    void s.add(a);
    void s.add(b);
    frame(s, 2); // 4 ms left, 2 ms each → 4 units each
    expect(a.slices).toEqual([4]);
    expect(b.slices).toEqual([4]);
    frame(s, 6); // nothing left: still one unit each
    expect(a.slices).toEqual([4, 1]);
    expect(b.slices).toEqual([4, 1]);
  });

  it("stops a job at its own boundary (e.g. a readback point)", () => {
    const s = new FrameScheduler<Enc>({ budgetMs: 100, defaultUnitMs: 0.1, maxUnits: 1000 });
    const a = job("a", 120, { boundary: 50 });
    void s.add(a);
    frame(s);
    frame(s);
    frame(s);
    expect(a.slices).toEqual([50, 50, 20]);
  });

  it("does not encode a job again until its follow-up resolves, then retires it", async () => {
    const s = new FrameScheduler<Enc>({ budgetMs: 100, defaultUnitMs: 1 });
    const a = job("a", 30, { async: true });
    let finished = false;
    const p = s.add(a).then(() => {
      finished = true;
    });
    frame(s);
    expect(a.slices).toEqual([30]);
    frame(s); // waiting on the readback: no new slice
    expect(a.slices).toEqual([30]);
    // Let a premature resolution run its microtask before asserting. The final
    // slice has no units left, but its readback still owns the job's buffers.
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(s.busy).toBe(true);
    a.release();
    await p;
    expect(finished).toBe(true);
    expect(s.busy).toBe(false);
  });

  it("rejects a job whose slice throws, and drops it", async () => {
    const s = new FrameScheduler<Enc>({ budgetMs: 10 });
    const bad: SlicedJob<Enc> = {
      name: "bad",
      remaining: () => 5,
      encode: () => {
        throw new Error("boom");
      },
    };
    const p = s.add(bad);
    frame(s);
    await expect(p).rejects.toThrow("boom");
    expect(s.busy).toBe(false);
  });
});
