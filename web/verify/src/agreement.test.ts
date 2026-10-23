import { describe, expect, it } from "vitest";
import { agreement } from "./index.js";

const declared = { relative: 1e-4, absolute: 0 };

describe("agreement (the capture_roundtrip criterion)", () => {
  it("passes a run within the declared budget and scores the interleaved channel", () => {
    const ref = [1, 2, 3];
    const run = new Float32Array([1, 9, 2.0001, 9, 3, 9]);
    const r = agreement(ref, run, declared, 2, 0);
    expect(r.pass).toBe(true);
    expect(r.invalid).toBeUndefined();
    expect(r.maxAbs).toBeCloseTo(1e-4, 6);
  });

  it("fails a run over budget", () => {
    expect(agreement([1, 2, 3], [1, 2, 3.01], declared).pass).toBe(false);
  });

  it("fails a run containing NaN instead of scoring it as zero error", () => {
    const r = agreement([1, 2, 3], [Number.NaN, Number.NaN, Number.NaN], declared);
    expect(r.pass).toBe(false);
    expect(r.ratio).toBe(Infinity);
    expect(r.invalid).toMatch(/run value 0/);
  });

  it("fails a non-finite value on the reference side", () => {
    expect(agreement([1, Infinity], [1, 1], declared).invalid).toMatch(/reference value 1/);
  });

  it("fails a run shorter than the reference at its stride and offset", () => {
    const r = agreement([1, 2, 3], new Float32Array(5), declared, 2, 1);
    expect(r.pass).toBe(false);
    expect(r.invalid).toMatch(/needs 6/);
  });
});
