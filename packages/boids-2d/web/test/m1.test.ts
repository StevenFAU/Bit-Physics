// Swarm M1 (03-boids-2d.md): the pure pieces behind The Order Dial, The Mill
// and the three-LOD renderer. GPU behaviour (brute ≡ sort for the brains, the
// re-sort with noise, φ(η) against the CPU reference) is checked in the
// browser by v2-acceptance.mjs and the page's own Prove cards.

import { describe, expect, it } from "vitest";
import fieldWgsl from "../src/v2/render/field.wgsl?raw";
import oceanWgsl from "../src/v2/render/ocean.wgsl?raw";
import { BRAIN_BYTES, BRAIN_FLOATS, WGSL_BRAINS, brainSeed, hashU32, reach, writeBrainParams } from "../src/v2/model/brains.js";
import { makeInitM1 } from "../src/v2/model/init-m1.js";
import { METER, OrderMeter, chiPeak, settingKey } from "../src/v2/model/meter.js";
import { noiseDraw, runVicsekCpu } from "../src/v2/model/vicsek-cpu.js";
import { settledMean, zScore } from "../src/v2/proof/vicsek-check.js";
import { lodFor } from "../src/v2/render/ocean-view.js";
import { TUNSTROM, tunstromRegime } from "../src/v2/regime.js";
import { couzinFor, millRadius, vicsekFor, vicsekRadius, vicsekRho } from "../src/v2/scenes.js";

describe("the Order Dial's meter", () => {
  it("waits out the relaxation, then measures ⟨φ⟩ and χ = N·Var(φ)", () => {
    const m = new OrderMeter({ relax: 100, window: 200, maxWindow: 1000, settleTol: 0.02 });
    m.reset(0.2, 1, 1000, 0);
    expect(m.push(50, 0.9)).toBeNull(); // still relaxing
    let last = null;
    for (let t = 100; t <= 320; t += 10) last = m.push(t, t % 20 === 0 ? 0.8 : 0.6);
    expect(last).not.toBeNull();
    expect(last!.phi).toBeCloseTo(0.7, 2);
    expect(last!.chi).toBeCloseTo(1000 * 0.01, 1); // Var of ±0.1 around 0.7
    expect(last!.settled).toBe(true);
    expect(last!.steps).toBeGreaterThanOrEqual(200);
  });

  it("flags a drifting trace as not settled", () => {
    const m = new OrderMeter({ relax: 0, window: 100, maxWindow: 1000, settleTol: 0.02 });
    m.reset(0.3, 1, 1, 0);
    let last = null;
    for (let t = 1; t <= 200; t += 5) last = m.push(t, 0.8 - t * 0.001);
    expect(last!.settled).toBe(false);
    expect(last!.drift).toBeLessThan(-0.02);
  });

  it("ignores stale and out-of-order samples, and its window rolls", () => {
    const m = new OrderMeter({ relax: 0, window: 50, maxWindow: 100, settleTol: 0.02 });
    m.reset(0.1, 2, 10, 1000);
    expect(m.push(999, 0.5)).toBeNull();
    for (let t = 1001; t <= 1300; t += 2) m.push(t, 0.5);
    expect(m.push(1299, 0.9)).toBeNull(); // the same tick again
    const r = m.push(1302, 0.5)!;
    expect(r.steps).toBeLessThanOrEqual(100);
  });

  it("declares its protocol", () => {
    expect(METER).toEqual({ relax: 400, window: 600, maxWindow: 2400, settleTol: 0.02 });
    expect(settingKey(0.25, 2)).toBe(settingKey(0.2501, 2.001));
    expect(settingKey(0.25, 2)).not.toBe(settingKey(0.26, 2));
  });

  it("locates η_c at the χ peak, refined by a parabola", () => {
    const pts = [0.1, 0.2, 0.3, 0.4, 0.5].map((eta) => ({ eta, chi: 10 - 100 * (eta - 0.33) ** 2 }));
    expect(chiPeak(pts)!.eta).toBeCloseTo(0.33, 6);
    expect(chiPeak([{ eta: 0.1, chi: 5 }, { eta: 0.2, chi: 1 }])!.eta).toBe(0.1);
    expect(chiPeak([])).toBeNull();
  });
});

describe("Tunstrøm et al. 2013's regimes", () => {
  it("uses the paper's cutoffs, not hand-tuned ones", () => {
    expect(TUNSTROM).toEqual({ hi: 0.65, lo: 0.35 });
    expect(tunstromRegime(0.9, 0.1)).toBe("polarized");
    expect(tunstromRegime(0.1, 0.8)).toBe("milling");
    expect(tunstromRegime(0.1, 0.1)).toBe("swarm");
    expect(tunstromRegime(0.5, 0.5)).toBe("transitional");
    // the edges are strict inequalities
    expect(tunstromRegime(0.65, 0.1)).toBe("transitional");
    expect(tunstromRegime(0.2, 0.65)).toBe("transitional");
  });
});

describe("the three levels of detail", () => {
  it("cross-fade by the fish's size on screen", () => {
    expect(lodFor(0.5)).toMatchObject({ glyph: 0, field: 1, name: "field" });
    expect(lodFor(3)).toMatchObject({ glyph: 0, field: 0, name: "streak" });
    expect(lodFor(12)).toMatchObject({ glyph: 1, field: 0, name: "glyph" });
    // continuous: no jump anywhere
    let prev = lodFor(0.1);
    for (let px = 0.1; px < 20; px += 0.01) {
      const l = lodFor(px);
      expect(Math.abs(l.glyph - prev.glyph)).toBeLessThan(0.02);
      expect(Math.abs(l.field - prev.field)).toBeLessThan(0.05);
      prev = l;
    }
  });

  it("splat and render share one View struct", () => {
    const view = (src: string): string => {
      const m = /struct View \{[\s\S]*?\n\};/.exec(src);
      if (!m) throw new Error("no View struct");
      return m[0];
    };
    expect(view(fieldWgsl)).toBe(view(oceanWgsl));
    // the shader's LOD edges are lodFor's
    expect(oceanWgsl).toContain("smoothstep(1.5, 8.0, lenPx)");
  });
});

describe("the M1 brains", () => {
  it("write their uniform where the WGSL reads it", () => {
    expect(BRAIN_BYTES).toBe(96);
    expect(WGSL_BRAINS).toContain("frameSeed: u32, n: u32");
    const buf = new ArrayBuffer(512);
    writeBrainParams(buf, 256, {
      brain: { kind: "vicsek", p: { r: 0.05, speed: 0.01, eta: 0.3 } },
      halfW: 2,
      halfH: 1,
      cols: 80,
      rows: 40,
      cellX: 0.05,
      cellY: 0.05,
      seed: 7,
      step: 11,
      n: 4096,
      fear: null,
    });
    const f = new Float32Array(buf, 256, BRAIN_FLOATS);
    const u = new Uint32Array(buf, 256, BRAIN_FLOATS);
    expect([f[0], f[1], f[2], f[3]]).toEqual([2, 1, 80, 40]);
    expect(f[6]).toBeCloseTo(0.01, 7);
    expect(f[7]).toBeCloseTo(0.3, 7);
    expect(f[8]).toBeCloseTo(0.0025, 7); // r²
    expect(u[14]).toBe(brainSeed(7, 11));
    expect(u[15]).toBe(4096);
    expect(new Float32Array(buf, 0, 4)).toEqual(new Float32Array(4)); // only its own slot
  });

  it("hash (seed, step) pairs apart", () => {
    expect(hashU32(0)).toBe(0);
    expect(brainSeed(1, 0)).not.toBe(brainSeed(0, 1));
    const seen = new Set<number>();
    for (let s = 0; s < 8; s += 1) for (let t = 0; t < 256; t += 1) seen.add(brainSeed(s, t));
    expect(seen.size).toBe(8 * 256);
    const d = noiseDraw(5, brainSeed(3, 9));
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(1);
  });

  it("size the scenes in Vicsek's units and Couzin's", () => {
    expect(vicsekRho(vicsekRadius(2))).toBeCloseTo(2, 10);
    expect(vicsekFor(1, 0.2).speed / vicsekFor(1, 0.2).r).toBeCloseTo(0.2, 10);
    const c = couzinFor(8192);
    expect(c.ro - c.rr).toBe(1);
    expect(c.ra).toBeGreaterThan(2 * millRadius(8192)); // the attraction zone spans the school
    expect(reach({ kind: "couzin", p: c })).toBe(c.ra);
  });

  it("start the Order Dial ordered and the Mill as a ring", () => {
    const a = makeInitM1(1000, 1, 10, 5, 0.01, "aligned");
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < 1000; i += 1) {
      const vx = a[i * 6 + 2]!;
      const vy = a[i * 6 + 3]!;
      const l = Math.hypot(vx, vy);
      sx += vx / l;
      sy += vy / l;
    }
    expect(Math.hypot(sx, sy) / 1000).toBeGreaterThan(0.99);
    const m = makeInitM1(1000, 1, 100, 50, 0.3, "annulus");
    let rot = 0;
    for (let i = 0; i < 1000; i += 1) {
      const x = m[i * 6]!;
      const y = m[i * 6 + 1]!;
      const r = Math.hypot(x, y);
      expect(r).toBeGreaterThan(0.12 * 50 - 1e-3);
      expect(r).toBeLessThan(0.3 * 50 + 1e-3);
      rot += (x * m[i * 6 + 3]! - y * m[i * 6 + 2]!) / (r * 0.3);
    }
    expect(rot / 1000).toBeGreaterThan(0.9); // anticlockwise
  });
});

describe("the Vicsek CPU reference", () => {
  const init = (n: number, L: number, aligned: boolean, seed = 1): Float64Array => {
    const f = makeInitM1(n, seed, L / 2, L / 2, 0.2, aligned ? "aligned" : "disc");
    const out = new Float64Array(n * 4);
    for (let i = 0; i < n; i += 1) for (let w = 0; w < 4; w += 1) out[i * 4 + w] = f[i * 6 + w]!;
    return out;
  };

  it("keeps an aligned school aligned without noise, and melts it with full noise", () => {
    const calm = runVicsekCpu({ n: 256, L: 16, v0: 0.2, eta: 0, seed: 1, steps: 200, every: 50, init: init(256, 16, true) });
    expect(calm[calm.length - 1]!).toBeGreaterThan(0.97);
    const panic = runVicsekCpu({ n: 256, L: 16, v0: 0.2, eta: 1, seed: 1, steps: 200, every: 50, init: init(256, 16, true) });
    expect(panic[panic.length - 1]!).toBeLessThan(0.25);
  });

  it("is deterministic", () => {
    const a = runVicsekCpu({ n: 128, L: 8, v0: 0.2, eta: 0.3, seed: 4, steps: 100, every: 10, init: init(128, 8, false) });
    const b = runVicsekCpu({ n: 128, L: 8, v0: 0.2, eta: 0.3, seed: 4, steps: 100, every: 10, init: init(128, 8, false) });
    expect([...a]).toEqual([...b]);
  });
});

describe("the φ(η) comparison", () => {
  it("is a two-sample z of the seed means", () => {
    expect(zScore([1, 1, 1], [1, 1, 1])).toBe(0);
    expect(zScore([0.9, 0.92, 0.91, 0.93], [0.6, 0.62, 0.61, 0.63])).toBeGreaterThan(20);
    expect(zScore([0.5, 0.6, 0.7, 0.4], [0.55, 0.45, 0.65, 0.5])).toBeLessThan(1);
    expect(settledMean([9, 9, 1, 1, 1], 10, 20)).toBe(1);
  });
});
