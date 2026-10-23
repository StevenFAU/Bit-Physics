import { describe, expect, it } from "vitest";
import { HashStream, hash3, mix32, unit } from "./hash.js";

describe("counter-based hash", () => {
  it("is a pure function of its inputs (replayable)", () => {
    expect(hash3(1, 2, 3)).toBe(hash3(1, 2, 3));
    expect(hash3(1, 2, 3)).not.toBe(hash3(1, 2, 4));
    const a = new HashStream(42, 1);
    const b = new HashStream(42, 1);
    expect(Array.from({ length: 8 }, () => a.next())).toEqual(Array.from({ length: 8 }, () => b.next()));
  });

  it("matches the WGSL bp/hash lowbias32 constants (regression pins)", () => {
    expect(mix32(0)).toBe(0);
    expect(mix32(1)).toBe(1753845952);
    expect(mix32(0xdeadbeef)).toBe(3861431939);
  });

  it("unit() stays in [0, 1) and is roughly uniform", () => {
    let sum = 0;
    for (let i = 0; i < 20000; i += 1) {
      const u = unit(hash3(7, i, 0));
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      sum += u;
    }
    expect(Math.abs(sum / 20000 - 0.5)).toBeLessThan(0.01);
  });
});
