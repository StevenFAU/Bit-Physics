import { describe, expect, it } from "vitest";
import { dominantWavelength, patternStats } from "../src/v2/learn/instruments.js";

describe("pattern statistics", () => {
  it("counts separate spots, wrapping on a periodic dish", () => {
    const w = 40;
    const h = 20;
    const v = new Float32Array(w * h);
    const spot = (cx: number, cy: number): void => {
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) v[((cy + dy + h) % h) * w + ((cx + dx + w) % w)] = 0.3;
    };
    spot(5, 5);
    spot(20, 10);
    spot(0, 15); // straddles the left/right edge
    expect(patternStats(v, w, h, true).pieces).toBe(3);
    // without wrapping, the edge spot is two pieces (3 cells at x = 39, 6 at x = 0..1)
    expect(patternStats(v, w, h, false).pieces).toBe(4);
    const s = patternStats(v, w, h, true);
    expect(s.coverage).toBeCloseTo(27 / 800, 6);
    expect(s.peakV).toBeCloseTo(0.3, 6);
  });
});

describe("dominant wavelength", () => {
  it("finds a clear peak and refines it", () => {
    const n = 256;
    const p = new Float32Array(n / 2).fill(1);
    p[16] = 400;
    p[15] = 100;
    p[17] = 100;
    const r = dominantWavelength(p, n);
    expect(r.peak).toBe(16);
    expect(r.wavelength).toBeCloseTo(16, 0);
  });

  it("reports no peak for a spectrum with nothing but its envelope", () => {
    const p = new Float32Array(128).fill(1e-3);
    p[1] = 50;
    p[2] = 20;
    p[3] = 5;
    expect(dominantWavelength(p, 256).wavelength).toBeNull();
  });
});
