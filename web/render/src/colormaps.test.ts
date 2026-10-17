import { describe, expect, it } from "vitest";
import type { Rgb } from "./colormaps.js";
import { COLORMAP_DEFS, linearToOklab, oklabToLinear, sampleColormap, srgbToLinear } from "./colormaps.js";

const lin = (c: Rgb): Rgb => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])];
// Viénot, Brettel & Mollon 1999 dichromat simulation in linear RGB.
const PROTAN = [0.11238, 0.88762, 0, 0.11238, 0.88762, 0, 0.00401, -0.00401, 1];
const DEUTAN = [0.29275, 0.70725, 0, 0.29275, 0.70725, 0, -0.02234, 0.02234, 1];
const apply = (m: number[], c: Rgb): Rgb => [
  m[0]! * c[0] + m[1]! * c[1] + m[2]! * c[2],
  m[3]! * c[0] + m[4]! * c[1] + m[5]! * c[2],
  m[6]! * c[0] + m[7]! * c[1] + m[8]! * c[2],
];
const dE = (a: Rgb, b: Rgb): number => {
  const x = linearToOklab(a);
  const y = linearToOklab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

describe("colormaps", () => {
  it("OKLab round-trips", () => {
    const c: Rgb = [0.2, 0.5, 0.8];
    const back = oklabToLinear(linearToOklab(c));
    c.forEach((v, i) => expect(back[i]).toBeCloseTo(v, 6));
  });

  it("LUT endpoints are the published stops", () => {
    for (const d of COLORMAP_DEFS) {
      const a = sampleColormap(d, 0);
      const b = sampleColormap(d, 1);
      d.stops[0]!.forEach((v, i) => expect(a[i]).toBeCloseTo(v, 3));
      d.stops[d.stops.length - 1]!.forEach((v, i) => expect(b[i]).toBeCloseTo(v, 3));
    }
  });

  it("sequential maps rise monotonically in lightness", () => {
    for (const d of COLORMAP_DEFS.filter((x) => x.kind === "sequential")) {
      let prev = -1;
      for (let i = 0; i <= 64; i += 1) {
        const L = linearToOklab(lin(sampleColormap(d, i / 64)))[0];
        expect(L).toBeGreaterThan(prev - 1e-6);
        prev = L;
      }
    }
  });

  // Measured 2026-10-17 (OKLab ΔE between the arms at t and 1 − t):
  //   ice-fire  t 0.05: normal 0.311, protan 0.204, deutan 0.296
  //   teal-rust t 0.05: normal 0.179, protan 0.097, deutan 0.134
  // Near the neutral centre every diverging map converges, so only the arms
  // (t ≤ 0.25) are held: an absolute floor, and at least ~half the contrast a
  // trichromat sees.
  it("diverging arms stay distinct under protan and deutan vision", () => {
    for (const d of COLORMAP_DEFS.filter((x) => x.kind === "diverging")) {
      for (const t of [0.05, 0.15, 0.25]) {
        const lo = lin(sampleColormap(d, t));
        const hi = lin(sampleColormap(d, 1 - t));
        const normal = dE(lo, hi);
        for (const m of [PROTAN, DEUTAN]) {
          const cvd = dE(apply(m, lo), apply(m, hi));
          expect(cvd, `${d.name} t=${t}`).toBeGreaterThan(0.08);
          expect(cvd / normal, `${d.name} t=${t}`).toBeGreaterThan(0.45);
        }
      }
    }
  });
});
