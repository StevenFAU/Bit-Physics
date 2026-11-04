// Swarm M3 (03-boids-2d.md): the pure pieces behind Eyes Only, the Species
// Matrix and Watch one. The vision model's binned field and its integrals are
// checked in f64 against direct integration and against the equilibrium the
// paper derives; the species presets and the species draw are the v4 lab's
// own functions, evaluated from its page; the uniform writers put every word
// where the WGSL reads it. GPU behaviour is checked in the browser
// (v2-acceptance.mjs and the page's Prove cards).

import { describe, expect, it } from "vitest";
import v4Page from "../index.html?raw";
import fieldWgsl from "../src/v2/render/field.wgsl?raw";
import oceanWgsl from "../src/v2/render/ocean.wgsl?raw";
import watchWgsl from "../src/v2/render/watch.wgsl?raw";
import { decodeKinds, encodeKinds, presetOf } from "../src/v2/kinds-link.js";
import { ownKindShare } from "../src/v2/matrix-panel.js";
import { BRAIN_FLOATS } from "../src/v2/model/brains.js";
import {
  NO_WATCH,
  SPECIES_BYTES,
  SPECIES_FLOATS,
  VISION_BYTES,
  VISION_FLOATS,
  WGSL_SPECIES,
  WGSL_VISION,
  speciesPreset,
  visionTable,
  writeM3Params,
} from "../src/v2/model/brains-m3.js";
import type { SpeciesPreset } from "../src/v2/model/brains-m3.js";
import { GROUP_BOX_BL, makeInitM3, speciesOf } from "../src/v2/model/init-m3.js";
import {
  VISION_BINS,
  VISION_WORDS,
  binOf,
  boundaryTables,
  discBins,
  edgeWeightFor,
  equilibriumDistance,
  fieldTerms,
  runVisionCpu,
  schoolStats,
  setBins,
  stateFromBoids,
  statePolarization,
  visionState,
  visualField,
  visionStep,
} from "../src/v2/model/vision-cpu.js";
import type { VisionParams } from "../src/v2/model/vision-cpu.js";
import { MAX_LIST, WATCH_HEADER, readWatchRecord } from "../src/v2/model/watch.js";
import { EYES_LEQ, SCENES, sceneById, visionFor } from "../src/v2/scenes.js";

const TAU = Math.PI * 2;
const tab = boundaryTables();

/** The scene's model as the CPU reference takes it. */
function params(o: Partial<VisionParams> = {}): VisionParams {
  const p = visionFor();
  return { R: p.R, v0: p.speed, gamma: p.gamma, a0: p.a0, a1: p.a1, b0: p.b0, b1: p.b1, dt: p.dt, range: p.range, ...o };
}

/** One disc's field, centred at angle th (from the heading) with half-angle dl. */
function disc(th: number, dl: number): Uint32Array {
  const V = new Uint32Array(VISION_WORDS);
  const [lo, hi] = discBins(th, dl);
  setBins(V, lo, hi);
  return V;
}

describe("Eyes Only: the binned visual field", () => {
  it("covers the bins whose centres lie within a disc, and at least its own", () => {
    const w = TAU / VISION_BINS;
    // a disc much narrower than a bin covers exactly the bin its centre is in
    const V = disc(0.3 * w, 0.01 * w);
    const set = [...Array(VISION_BINS).keys()].filter((k) => binOf(V, k));
    expect(set).toEqual([VISION_BINS / 2]);
    // a wide disc: every bin centre inside [th − dl, th + dl], none outside
    const th = 0.4;
    const dl = 0.2;
    const W = disc(th, dl);
    for (let k = 0; k < VISION_BINS; k += 1) {
      const c = -Math.PI + (k + 0.5) * w;
      expect(binOf(W, k)).toBe(Math.abs(c - th) <= dl ? 1 : 0);
    }
  });

  it("wraps behind the fish (φ = ±π)", () => {
    const V = disc(Math.PI - 0.01, 0.05);
    expect(binOf(V, 0)).toBe(1);
    expect(binOf(V, VISION_BINS - 1)).toBe(1);
    expect(binOf(V, VISION_BINS / 2)).toBe(0);
  });

  it("integrates exactly over the covered bins, from the transitions alone", () => {
    const V = new Uint32Array(VISION_WORDS);
    setBins(V, 10, 40);
    setBins(V, 100, 101);
    setBins(V, 250, 260); // wraps past φ = π
    const t = fieldTerms(V, tab);
    // direct: Σ over covered bins of the bin's exact ∫cos, ∫sin
    let bc = 0;
    let bs = 0;
    const w = TAU / VISION_BINS;
    for (let k = 0; k < VISION_BINS; k += 1) {
      if (!binOf(V, k)) continue;
      const a = -Math.PI + k * w;
      bc += Math.sin(a + w) - Math.sin(a);
      bs += Math.cos(a) - Math.cos(a + w);
    }
    expect(t.bc).toBeCloseTo(bc, 12);
    expect(t.bs).toBeCloseTo(bs, 12);
    expect(t.edges).toBe(6);
  });

  it("sees nothing to integrate when the view is full, and no edges", () => {
    const V = new Uint32Array(VISION_WORDS);
    setBins(V, 3, 3 + VISION_BINS);
    const t = fieldTerms(V, tab);
    expect(t.edges).toBe(0);
    expect(t.cover).toBe(1);
    expect(Math.abs(t.bc) + Math.abs(t.bs)).toBe(0);
  });

  it("balances one fish ahead at the paper's L_eq = BL / (2α₁)", () => {
    const p = params();
    expect(equilibriumDistance(p.a1, p.R)).toBeCloseTo(EYES_LEQ, 12);
    expect(edgeWeightFor(EYES_LEQ, p.R)).toBeCloseTo(p.a1, 12);
    // the visual speed term −bc + α₁·ec for one disc dead ahead at distance ρ: negative close (pushed back), positive far (drawn on)
    const term = (rho: number): number => {
      const t = fieldTerms(disc(0, Math.asin(p.R / rho)), tab);
      return -t.bc + p.a1 * t.ec;
    };
    expect(term(0.6 * EYES_LEQ)).toBeLessThan(0);
    expect(term(1.6 * EYES_LEQ)).toBeGreaterThan(0);
    // the zero crossing lies within a bin's resolution of L_eq
    let lo = 0.6 * EYES_LEQ;
    let hi = 1.6 * EYES_LEQ;
    for (let i = 0; i < 40; i += 1) {
      const m = (lo + hi) / 2;
      if (term(m) < 0) lo = m;
      else hi = m;
    }
    expect(Math.abs(lo - EYES_LEQ) / EYES_LEQ).toBeLessThan(0.15);
    // a disc to the left (φ > 0) turns the fish away from it close up (−bs < 0 · β₀ > 0 ⇒ dψ < 0)
    const side = fieldTerms(disc(Math.PI / 2, Math.asin(p.R / (0.6 * EYES_LEQ))), tab);
    expect(-side.bs + p.b1 * side.es).toBeLessThan(0);
  });

  it("hides a fish behind a nearer one (the field is a union of discs)", () => {
    const p = params();
    const init = new Float64Array([0, 0, 0.5, 0, 2, 0, 0.5, 0, 6, 0, 0.5, 0]);
    const s3 = visionState(3, 50, 50, init);
    const s2 = visionState(2, 50, 50, init.slice(0, 8));
    expect([...visualField(s3, 0, p)]).toEqual([...visualField(s2, 0, p)]);
    // and a fish beyond its sight is not seen at all
    const far = visionState(2, 50, 50, new Float64Array([0, 0, 0.5, 0, p.range + 0.1, 0, 0.5, 0]));
    expect([...visualField(far, 0, p)].every((x) => x === 0)).toBe(true);
  });

  it("a lone fish relaxes to v₀ and keeps its heading", () => {
    const p = params();
    const s = visionState(1, 50, 50, new Float64Array([0, 0, 0, 0.7]));
    for (let i = 0; i < 200; i += 1) visionStep(s, p, tab);
    expect(s.v[0]).toBeCloseTo(p.v0, 6);
    expect(s.psi[0]).toBe(0.7);
  });

  it("round-trips the GPU boid layout (ψ in align, the step's displacement in vel)", () => {
    const vp = visionFor();
    const b = makeInitM3(64, 5, 40, 40, { kind: "vision", p: vp }, "sight");
    const st = stateFromBoids(b, 64, vp.dt);
    for (let i = 0; i < 64; i += 1) {
      expect(st[i * 4 + 3]).toBe(b[i * 6 + 4]);
      expect(st[i * 4 + 2]!).toBeGreaterThanOrEqual(-1e-6);
      expect(st[i * 4 + 2]!).toBeLessThan(vp.speed + 1e-6);
    }
    // the group start fills a 5-body-length box
    const g = makeInitM3(200, 9, 100, 100, { kind: "vision", p: vp }, "group");
    for (let i = 0; i < 200; i += 1) expect(Math.max(Math.abs(g[i * 6]!), Math.abs(g[i * 6 + 1]!))).toBeLessThanOrEqual((GROUP_BOX_BL * 2 * vp.R) / 2);
  });

  it("the reference polarizes a small group with no alignment rule, and not without its edge terms", () => {
    // one seed, a quick run: the in-page check measures the distribution
    const p = { ...params(), range: 100 };
    const vp = { ...visionFor(), range: 100 };
    const init = stateFromBoids(makeInitM3(20, 2, 200, 200, { kind: "vision", p: vp }, "group"), 20, vp.dt);
    const on = runVisionCpu({ n: 20, halfW: 200, halfH: 200, params: p, init, steps: 3000, every: 100 });
    const off = runVisionCpu({ n: 20, halfW: 200, halfH: 200, params: { ...p, a1: 0, b1: 0 }, init, steps: 3000, every: 100 });
    const late = (a: Float64Array): number => a.slice(15).reduce((s, x) => s + x, 0) / (a.length - 15);
    expect(late(on)).toBeGreaterThan(0.5);
    expect(late(off)).toBeLessThan(0.35);
  });

  it("counts schools and their own order on the torus", () => {
    // two tight groups, far apart, one aligned (east) and one not; one group straddles the wrapped edge
    const n = 40;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    const vx = new Float64Array(n);
    const vy = new Float64Array(n);
    for (let i = 0; i < 20; i += 1) {
      // 0.8 apart, the first group across the wrapped edge at x = ±50 (49.6 → −49.6 is 0.8 on the torus)
      const col = i % 5;
      x[i] = col < 3 ? 48 + col * 0.8 : -49.6 + (col - 3) * 0.8;
      y[i] = Math.floor(i / 5) * 0.8;
      vx[i] = 1;
      x[20 + i] = 10 + col * 0.8;
      y[20 + i] = 10 + Math.floor(i / 5) * 0.8;
      vx[20 + i] = Math.cos(i * 2.4);
      vy[20 + i] = Math.sin(i * 2.4);
    }
    const st = schoolStats(x, y, vx, vy, n, 50, 50, 2.5, 5);
    expect(st.schools).toBe(2);
    expect(st.schooled).toBe(40);
    expect(st.order).toBeLessThan(1);
    expect(st.order).toBeGreaterThan(0.5);
    expect(statePolarization(visionState(2, 9, 9, new Float64Array([0, 0, 1, 0, 1, 1, -1, Math.PI])))).toBeCloseTo(1, 12);
  });
});

describe("Species Matrix", () => {
  /** The v4 lab's own speciesConfig / makeSpeciesData, evaluated from its page with a stand-in for its settings. */
  const v4 = (() => {
    const grab = (re: RegExp): string => {
      const m = re.exec(v4Page);
      if (!m) throw new Error(`${re} not found in the v4 page`);
      return m[0];
    };
    const src = [grab(/function mulberry32\(a\)\{.*\}/), grab(/function speciesConfig\(\)\{[\s\S]*?\n\}/), grab(/function makeSpeciesData\(n,seed\)\{[\s\S]*?\n\}/)].join("\n");
    return new Function("S", `${src}; return { speciesConfig, makeSpeciesData };`) as (S: object) => {
      speciesConfig: () => { NS: number; gc: Float32Array; ga: Float32Array; spd: number[]; frac: number[] };
      makeSpeciesData: (n: number, seed: number) => Uint32Array;
    };
  })();

  it("keeps the v4 lab's presets for 2–4 kinds (and extends them to 6)", () => {
    for (const preset of ["cycle", "predator", "segregate", "mixed"] as SpeciesPreset[]) {
      for (let n = 2; n <= 4; n += 1) {
        const ref = v4({ speciesCount: n, speciesPreset: preset, wCoh: 0.9, wAli: 1.1, xCoh: 0, xAli: 0 }).speciesConfig();
        const ours = speciesPreset(preset, n);
        // v4's predator preset has one prey kind and leaves kinds ≥ 2 empty (no fish, no couplings);
        // ours makes every kind but 1 a prey kind — so compare the prey–predator block there
        const m = preset === "predator" ? 2 : n;
        for (let i = 0; i < m; i += 1) {
          for (let j = 0; j < m; j += 1) {
            expect(ours.gc[i * 6 + j]).toBeCloseTo(ref.gc[i * 4 + j]!, 6);
            expect(ours.ga[i * 6 + j]).toBeCloseTo(ref.ga[i * 4 + j]!, 6);
          }
          expect(ours.spd[i]).toBe(ref.spd[i]);
          if (preset !== "predator" || n === 2) expect(ours.frac[i]).toBeCloseTo(ref.frac[i]!, 12);
        }
        if (preset === "predator") {
          for (let i = 2; i < n; i += 1) {
            expect(ours.gc[i * 6 + 1]).toBe(ours.gc[1]); // every prey kind flees the predator…
            expect(ours.gc[6 + i]).toBe(ours.gc[6]); // …and the predator chases each
          }
          expect(ours.frac.slice(0, n).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        }
      }
    }
    const six = speciesPreset("cycle", 6);
    expect(six.gc[5 * 6 + 0]).toBe(1.4);
    expect(six.gc[0 * 6 + 5]).toBe(-1.4);
  });

  it("draws each fish's kind the way the v4 lab does", () => {
    for (const [preset, n] of [["cycle", 3], ["cycle", 4], ["segregate", 2], ["predator", 2]] as [SpeciesPreset, number][]) {
      const ref = v4({ speciesCount: n, speciesPreset: preset, wCoh: 0.9, wAli: 1.1 }).makeSpeciesData(5000, 17);
      expect([...speciesOf(5000, 17, speciesPreset(preset, n))]).toEqual([...ref]);
    }
    const b = makeInitM3(1000, 4, 2, 1, { kind: "species", p: speciesPreset("cycle", 4) }, "species");
    expect(new Set([...Array(1000).keys()].map((i) => b[i * 6 + 4])).size).toBe(4);
  });

  it("writes the uniform where the WGSL reads it", () => {
    expect(SPECIES_BYTES).toBe(416);
    expect(SPECIES_FLOATS).toBe(BRAIN_FLOATS + 80);
    expect(WGSL_SPECIES).toContain("gc: array<vec4<f32>, 9>,\n  ga: array<vec4<f32>, 9>,\n  spd: array<vec4<f32>, 2>,");
    const p = speciesPreset("predator", 3);
    const buf = new ArrayBuffer(512);
    writeM3Params(buf, 0, { brain: { kind: "species", p }, halfW: 2, halfH: 1, cols: 10, rows: 5, cellX: 0.4, cellY: 0.4, seed: 1, step: 7, n: 99, fear: null });
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    expect(f[0]).toBe(2);
    expect(u[15]).toBe(99);
    expect(f[10]).toBeCloseTo(p.rCoh * p.rCoh, 9);
    expect(f[13]).toBe(3);
    expect(f[BRAIN_FLOATS + 1]).toBeCloseTo(-1.8, 6); // gc[0][1]: prey flee the predator
    expect(f[BRAIN_FLOATS + 6]).toBeCloseTo(1.6, 6); // gc[1][0]: the predator chases
    expect(f[BRAIN_FLOATS + 72 + 1]).toBeCloseTo(1.7, 6); // spd[1]
  });

  it("measures each kind's own share of its neighbours", () => {
    const n = 6;
    const b = new Float32Array(n * 6);
    [0, 0, 1, 1, 1, 2].forEach((k, i) => (b[i * 6 + 4] = k));
    [1, 0.5, 0.2, 0.4, 0.6, 1].forEach((d, i) => (b[i * 6 + 5] = d));
    const m = ownKindShare(b, n, 3);
    expect(m.share[0]).toBeCloseTo(0.75, 6);
    expect(m.share[1]).toBeCloseTo(0.4, 6);
    expect(m.fraction).toEqual([2 / 6, 3 / 6, 1 / 6]);
  });

  it("knows which preset a brain is from the brain itself", () => {
    for (const id of ["cycle", "predator", "segregate", "mixed"] as SpeciesPreset[]) for (let n = 2; n <= 6; n += 1) expect(presetOf(speciesPreset(id, n))).toBe(id);
    const p = speciesPreset("predator", 3);
    p.gc[2] = 0.5;
    expect(presetOf(p)).toBe("custom");
    // Tune's knobs do not change which preset the matrix is
    expect(presetOf({ ...speciesPreset("mixed", 4), rCoh: 0.12, eta: 0.2 })).toBe("mixed");
  });

  it("rides the share link: the matrix, the shares and Tune's knobs", () => {
    expect(encodeKinds(speciesPreset("cycle", 3))).toBe("cycle~3");
    expect(decodeKinds("predator~4")?.p).toEqual(speciesPreset("predator", 4));
    // a preset with Tune's knobs moved
    const tuned = { ...speciesPreset("cycle", 3), rCoh: 0.12, speed: 0.008, wSep: 2.05, eta: 0.13 };
    const tl = encodeKinds(tuned);
    expect(tl).toBe("cycle~3~p0.12,0.008,2.05,0.13");
    expect(decodeKinds(tl)).toEqual({ p: tuned, preset: "cycle" });
    // an edited predator matrix keeps its population shares
    const pred = speciesPreset("predator", 3);
    pred.gc[0 * 6 + 2] = 0.3;
    const pl = encodeKinds(pred);
    expect(pl).toMatch(/~f0\.425,0\.15,0\.425$/);
    const pb = decodeKinds(pl)!;
    expect(pb.preset).toBe("custom");
    pb.p.frac.forEach((f, k) => expect(f).toBeCloseTo(pred.frac[k]!, 12));
    expect(pb.p.spd[1]).toBe(1.7);
    const p = speciesPreset("segregate", 3);
    p.gc[0 * 6 + 2] = 1.3;
    p.ga[2 * 6 + 1] = -0.7;
    p.spd[1] = 2.1;
    const link = encodeKinds(p);
    expect(link).toMatch(/^custom~3~g[-0-9.,]+~a[-0-9.,]+~s[-0-9.,]+$/);
    const back = decodeKinds(link)!;
    expect(back.preset).toBe("custom");
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        expect(back.p.gc[i * 6 + j]).toBeCloseTo(p.gc[i * 6 + j]!, 9);
        expect(back.p.ga[i * 6 + j]).toBeCloseTo(p.ga[i * 6 + j]!, 9);
      }
      expect(back.p.spd[i]).toBeCloseTo(p.spd[i]!, 9);
    }
    expect(decodeKinds("cycle~9")).toBeNull();
    expect(decodeKinds("bogus~3")).toBeNull();
  });
});

describe("the vision uniform and Watch one", () => {
  it("writes the vision uniform where the WGSL reads it", () => {
    expect(VISION_BYTES).toBe(128);
    expect(VISION_FLOATS).toBe(BRAIN_FLOATS + 8);
    expect(WGSL_VISION).toContain("R: f32, gamma: f32, a0: f32, a1: f32,\n  b0: f32, b1: f32, dt: f32, _h: f32,\n  watch: u32, dumpAll: u32, step: u32, _j: u32,");
    const p = visionFor();
    const buf = new ArrayBuffer(512);
    writeM3Params(buf, 0, { brain: { kind: "vision", p }, halfW: 2, halfH: 1, cols: 10, rows: 5, cellX: 0.4, cellY: 0.4, seed: 1, step: 77, n: 9, fear: null, watch: 5 });
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    expect(f[8]).toBeCloseTo(p.range * p.range, 6);
    expect([f[20], f[21], f[22], f[23], f[24], f[25], f[26]]).toEqual([p.R, p.gamma, p.a0, p.a1, p.b0, p.b1, p.dt].map((x) => Math.fround(x)));
    expect([u[28], u[29], u[30]]).toEqual([5, 0, 77]);
    writeM3Params(buf, 0, { brain: { kind: "vision", p }, halfW: 2, halfH: 1, cols: 10, rows: 5, cellX: 0.4, cellY: 0.4, seed: 1, step: 0, n: 9, fear: null });
    expect(u[28]).toBe(NO_WATCH);
    // the bin-boundary table: f64 sin and cos stored f32, two bins per vec4
    const t = visionTable();
    expect(t.length).toBe(VISION_BINS * 2);
    expect(t[2 * 64 + 1]).toBe(Math.fround(Math.cos(-Math.PI + (64 * TAU) / VISION_BINS)));
  });

  it("reads the tracker's record", () => {
    const ab = new ArrayBuffer(WATCH_HEADER + MAX_LIST * 16);
    const u = new Uint32Array(ab);
    const f = new Float32Array(ab);
    u[0] = 1;
    u[1] = 33;
    u[2] = 1234;
    u[3] = MAX_LIST + 40; // more than the list holds
    f[4] = 1.5;
    f[5] = -2;
    f[6] = 0.01;
    f[7] = 0;
    f[10] = 0.105;
    u[11] = 300;
    f[16] = 0.02;
    const r = readWatchRecord(ab);
    expect(r).toMatchObject({ found: true, slot: 33, id: 1234, pos: [1.5, -2], radius: Math.fround(0.105), total: 300, listed: MAX_LIST });
    expect(r.list.length).toBe(MAX_LIST * 4);
    expect(r.list[0]).toBe(Math.fround(0.02));
  });

  it("draws from the same View struct as the fish", () => {
    const view = (src: string): string => {
      const m = /struct View \{[\s\S]*?\n\};/.exec(src);
      if (!m) throw new Error("no View struct");
      return m[0];
    };
    expect(view(watchWgsl)).toBe(view(oceanWgsl));
    expect(view(fieldWgsl)).toBe(view(oceanWgsl));
  });

  it("lists the M3 scenes with Watch and at most six tools", () => {
    expect(sceneById("eyes-only").brain?.(1).kind).toBe("vision");
    expect(sceneById("species").brain?.(1).kind).toBe("species");
    // tools: the scene's own, Watch on every live scene, Look — never more than six
    for (const s of SCENES) {
      const tools = (s.water ? 1 : 0) + (s.ecology ? 2 : 0) + (s.shark ? 1 : 0) + (s.kind === "live" ? 1 : 0) + 1;
      expect(tools).toBeLessThanOrEqual(6);
    }
  });
});
