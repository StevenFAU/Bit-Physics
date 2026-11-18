// Flow Sculpture v2 — the pure model code (packages/curl-noise/web/src/v2/model)
// and the gate port's uniform packing (src/v2/proof/gate.ts). GPU work is
// exercised in the browser by v2-acceptance.mjs and the release gate.
import { describe, expect, it } from "vitest";
import ic from "../public/gate-ic.json";
import { isoValues } from "../src/curlnoise64.mjs";
import {
  BALL_RADIUS,
  CANONICAL_FIELD,
  DUST_SHEETS,
  HUE,
  DENSITY_SHELLS,
  cloneField,
  f2Differs,
  fieldKind,
  isCanonical,
  mirrorConfigOf,
  packField,
  packLive,
  sameField,
  shellCounts,
  shellFractions,
  shellOf,
  surfaceResidual,
} from "../src/v2/model/flow.js";
import type { GateIc } from "../src/v2/proof/gate.js";
import { checkGate, mirrorConfig, packCanonicalField, packGateTracerUniform } from "../src/v2/proof/gate.js";
import { fieldOfIc } from "../src/v2/proof/prove.js";
import { sceneById } from "../src/v2/scenes.js";

const IC = ic as unknown as GateIc;

describe("the gate port's uniforms", () => {
  it("the live field uniform for the gate's field is byte-identical to the gate's", () => {
    const a = new Uint8Array(packCanonicalField(IC).buffer);
    const b = new Uint8Array(packField(fieldOfIc(IC), 0).buffer);
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it("the gate's field is the live model's canonical field", () => {
    expect(isCanonical(fieldOfIc(IC))).toBe(true);
    expect(sameField(fieldOfIc(IC), CANONICAL_FIELD)).toBe(true);
  });

  it("packs v1's tracer uniform: dt, count, RK4, no wrap, reprojection, v1's display constants", () => {
    const buf = packGateTracerUniform(IC);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    expect(buf.byteLength).toBe(224);
    expect(f[32]).toBe(Math.fround(IC.params.dt));
    expect(u[33]).toBe(IC.params.tracers);
    expect(u[37]).toBe(42);
    expect(f[38]).toBe(14);
    expect([u[39], u[41], u[42]]).toEqual([1, 0, 1]);
    expect(Array.from(f.subarray(48, 52))).toEqual([0.5, 0.5, 0.5, Math.fround(0.3)]);
  });

  it("the live uniform carries the step, the ball and Silk's sheets", () => {
    const buf = packLive(1000, 7, 96, { dt: 0.0012, maxAge: 0.6, respawn: true, reproject: true, seed: 5, sheets: [-0.08, 0.08], dust: false }, 1);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    expect(buf.byteLength).toBe(96);
    expect(Array.from(f.subarray(20, 24))).toEqual([0, Math.fround(HUE[0]), Math.fround(HUE[1]), 0]);
    const dust = new Float32Array(packLive(1000, 0, 1, { dt: 0.0024, maxAge: 0.6, respawn: true, reproject: true, seed: 5, sheets: DUST_SHEETS, dust: true }, 1));
    expect(dust[20]).toBe(1);
    expect(Array.from(dust.subarray(16, 20))).toEqual([3, Math.fround(-0.12), 0, Math.fround(0.12)]);
    expect(f[0]).toBe(Math.fround(0.0012));
    expect(f[3]).toBe(Math.fround(BALL_RADIUS));
    expect(Array.from(u.subarray(4, 8))).toEqual([1000, 1, 7, 96]);
    expect(Array.from(u.subarray(8, 12))).toEqual([1, 1, 5, 1]);
    expect(Array.from(f.subarray(16, 20))).toEqual([2, Math.fround(-0.08), Math.fround(0.08), 0]);
  });
});

describe("what is on screen", () => {
  const scene = sceneById("studio").field;
  it("names the gated field, the scene's, an evolving one and an edit", () => {
    expect(fieldKind(cloneField(CANONICAL_FIELD), scene)).toBe("gated");
    expect(fieldKind(cloneField(scene), scene)).toBe("scene");
    expect(fieldKind({ ...cloneField(scene), evolution: 0.1 }, scene)).toBe("evolving");
    const moved = cloneField(scene);
    moved.obstacle!.centre = [0.6, 0.5, 0.5];
    expect(fieldKind(moved, scene)).toBe("edited");
  });

  it("moving the sphere leaves f₂ (Silk's sheets) alone; the noise does not", () => {
    const moved = cloneField(scene);
    moved.obstacle!.centre = [0.6, 0.5, 0.5];
    expect(f2Differs(scene, moved)).toBe(false);
    expect(f2Differs(scene, { ...cloneField(scene), octaves: 3 })).toBe(true);
    expect(f2Differs(scene, { ...cloneField(scene), evolution: 0.2 })).toBe(true);
  });
});

describe("density shells", () => {
  it("equal-volume shells: uniform points fill them evenly, and the free fractions sum to 1", () => {
    const f = shellFractions(null, 100_000);
    expect(f.length).toBe(DENSITY_SHELLS);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    for (const x of f) expect(Math.abs(x - 1 / DENSITY_SHELLS)).toBeLessThan(0.01);
    // the innermost shell (r < 0.235) is 45 % sphere (r 0.18): (0.18 / 0.235)³
    const withSphere = shellFractions(CANONICAL_FIELD.obstacle, 100_000);
    expect(withSphere[0]! / withSphere[1]!).toBeGreaterThan(0.5);
    expect(withSphere[0]! / withSphere[1]!).toBeLessThan(0.6);
  });

  it("assigns points to shells and counts a readback", () => {
    expect(shellOf(0.5, 0.5, 0.5)).toBe(0);
    expect(shellOf(0.5 + BALL_RADIUS * 0.999, 0.5, 0.5)).toBe(DENSITY_SHELLS - 1);
    expect(shellOf(0.5 + BALL_RADIUS * 1.01, 0.5, 0.5)).toBe(-1);
    const xyzw = new Float32Array([0.5, 0.5, 0.5, 0, 2, 2, 2, 0, 0.5, 0.5 + BALL_RADIUS * 0.99, 0.5, 0]);
    const c = shellCounts(xyzw);
    expect(c[0]).toBe(1);
    expect(c[DENSITY_SHELLS - 1]).toBe(1);
    expect(c.reduce((a, b) => a + b, 0)).toBe(2);
  });
});

describe("the gate's observable, on the live view", () => {
  it("a particle exactly at its anchors has zero residual; a shifted anchor shows", () => {
    const p = cloneField(sceneById("studio").field);
    const pts = [0.3, 0.55, 0.62, 0, 0.71, 0.4, 0.33, 0].map(Math.fround);
    const anchors: number[] = [];
    for (let i = 0; i < 2; i += 1) anchors.push(...isoValues(pts.slice(i * 4, i * 4 + 3), mirrorConfigOf(p, 0)));
    const exact = surfaceResidual(new Float32Array(pts), anchors, p, 0);
    expect(exact.worst).toBeLessThan(1e-12);
    anchors[1]! += 1e-3;
    const off = surfaceResidual(new Float32Array(pts), anchors, p, 0);
    expect(off.worst).toBeCloseTo(1e-3, 9);
  });

  it("the in-page gate check: an unchanged run passes, a drifted one fails", () => {
    const n = IC.params.tracers;
    const f0 = new Float32Array(n * 2);
    const cfg = mirrorConfig(IC);
    const x0 = new Float32Array(IC.positions);
    for (let i = 0; i < n; i += 1) {
      const f = isoValues([x0[i * 3]!, x0[i * 3 + 1]!, x0[i * 3 + 2]!], cfg);
      f0[i * 2] = f[0]!;
      f0[i * 2 + 1] = f[1]!;
    }
    const steps = [0, 8, 16, 24, 32, 40, 48, 56, 64].map((step) => ({ step, state: { positions: { data: x0, shape: [n, 3], dtype: "f32" } }, diagnostics: {} }));
    const run = { steps, sha: "x", f0 } as never;
    const ok = checkGate(IC, run, run);
    expect(ok.passed).toBe(true);
    expect(ok.fraction).toBeLessThan(0.05);
    const drift = new Float32Array(x0);
    for (let k = 0; k < drift.length; k += 1) drift[k] = drift[k]! + 0.01;
    const bad = { steps: steps.map((s, i) => (i === 8 ? { ...s, state: { positions: { data: drift, shape: [n, 3], dtype: "f32" } } } : s)), sha: "x", f0 } as never;
    expect(checkGate(IC, bad, bad).passed).toBe(false);
  });
});
