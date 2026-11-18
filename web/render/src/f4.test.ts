// Unit tests for the liquid layer's CPU-side math (F4). The GPU passes run
// in the browser under Water in Hand's acceptance script.
import { describe, expect, it } from "vitest";
import { CUBE_FACES, cubeFaceDirection, cubeFaceView } from "./environment-probe.js";
import {
  DEFAULT_FILTER,
  WATER,
  chordScale,
  eyeDepthToNdc,
  filterRadiusPx,
  narrowRangeRow,
  narrowSample,
  ndcToEyeDepth,
  packLiquid,
  schlick,
  transmittance,
} from "./liquid-surface.js";
import type { Vec3 } from "./orbit-camera.js";
import { mul4, perspective } from "./orbit-camera.js";
import { invert4, transform4 } from "./view3d.js";

describe("environment probe faces", () => {
  it("each face's view renders exactly the texels a cube sample reads", () => {
    const eye: Vec3 = [0.3, -1.2, 2.5];
    const proj = perspective(Math.PI / 2, 1, 0.02, 100);
    for (let f = 0; f < 6; f += 1) {
      const inv = invert4(mul4(proj, cubeFaceView(f, eye)))!;
      for (let k = 0; k < 40; k += 1) {
        const u = (Math.sin(k * 12.9898 + f) * 0.5 + 0.5) * 0.98 + 0.01;
        const v = (Math.sin(k * 78.233 + f) * 0.5 + 0.5) * 0.98 + 0.01;
        // the pixel at (u, v), v down, through the face's camera
        const ndc = [2 * u - 1, 1 - 2 * v];
        const a = transform4(inv, [ndc[0]!, ndc[1]!, 0]);
        const b = transform4(inv, [ndc[0]!, ndc[1]!, 1]);
        const d: Vec3 = [b[0] / b[3] - a[0] / a[3], b[1] / b[3] - a[1] / a[3], b[2] / b[3] - a[2] / a[3]];
        const l = Math.hypot(...d);
        const want = cubeFaceDirection(f, u, v);
        for (let i = 0; i < 3; i += 1) expect(d[i]! / l).toBeCloseTo(want[i]!, 4);
        // and the cube convention picks this face for that direction
        const ax = want.map(Math.abs);
        const major = ax.indexOf(Math.max(...ax));
        expect(major * 2 + (want[major]! < 0 ? 1 : 0)).toBe(f);
      }
    }
  });

  it("the six faces' major axes are +X −X +Y −Y +Z −Z, each frame orthonormal", () => {
    const want: Vec3[] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    CUBE_FACES.forEach((f, i) => {
      expect(f.ma).toEqual(want[i]);
      const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(f.ma, f.sc)).toBe(0);
      expect(dot(f.ma, f.tc)).toBe(0);
      expect(dot(f.sc, f.tc)).toBe(0);
      // the face centre looks straight down the major axis
      expect(cubeFaceDirection(i, 0.5, 0.5)).toEqual(f.ma.map((x) => x + 0) as Vec3);
    });
  });
});

describe("liquid depth", () => {
  it("eye depth -> NDC matches the perspective() matrix and inverts", () => {
    const near = 0.02;
    const far = 100;
    const m = perspective(0.7, 1.6, near, far);
    for (const d of [0.02, 0.05, 0.4, 1.7, 9, 60, 100]) {
      const c = transform4(m, [0, 0, -d]);
      expect(eyeDepthToNdc(d, near, far)).toBeCloseTo(c[2] / c[3], 6);
      expect(ndcToEyeDepth(eyeDepthToNdc(d, near, far), near, far)).toBeCloseTo(d, 3);
    }
    // monotone: nearer is smaller, so the splat pass's "less" keeps the nearest sphere
    expect(eyeDepthToNdc(0.5, near, far)).toBeLessThan(eyeDepthToNdc(0.6, near, far));
  });

  it("the filter kernel is world-constant: half the px at twice the depth, clamped", () => {
    const at = (d: number): number => filterRadiusPx(0.01, 1, 2.9, 720, d, 48);
    expect(at(1)).toBeCloseTo(2 * at(2), 9);
    expect(at(0.01)).toBe(48);
    expect(at(1e6)).toBe(1);
  });
});

describe("thickness and shading", () => {
  it("summed chords of one sphere integrate to its volume; the scale turns that into the particle's volume", () => {
    const r = 0.37;
    // ∫∫ 2 r √(1 − ρ²) over the disc, numerically
    const n = 400;
    let vol = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const x = ((i + 0.5) / n) * 2 - 1;
        const y = ((j + 0.5) / n) * 2 - 1;
        const d2 = x * x + y * y;
        if (d2 <= 1) vol += 2 * r * Math.sqrt(1 - d2) * (2 * r / n) ** 2;
      }
    }
    expect(vol).toBeCloseTo((4 / 3) * Math.PI * r ** 3, 3);
    const spacing = 0.5;
    expect(vol * chordScale(spacing ** 3, r)).toBeCloseTo(spacing ** 3, 3);
    expect(chordScale(undefined, r)).toBe(1);
  });

  it("Beer–Lambert multiplies over successive layers; Schlick spans F0 to 1", () => {
    const a = transmittance(WATER.absorption, 0.2);
    const b = transmittance(WATER.absorption, 0.3);
    const ab = transmittance(WATER.absorption, 0.5);
    for (let i = 0; i < 3; i += 1) expect(a[i]! * b[i]!).toBeCloseTo(ab[i]!, 12);
    expect(transmittance(WATER.absorption, 0)).toEqual([1, 1, 1]);
    // pure water: red goes first
    expect(ab[0]).toBeLessThan(ab[1]);
    expect(ab[1]).toBeLessThan(ab[2]);
    expect(schlick(0.02, 1)).toBeCloseTo(0.02, 12);
    expect(schlick(0.02, 0)).toBeCloseTo(1, 12);
  });
});

describe("narrow-range filter", () => {
  const r = 1;
  const mu = DEFAULT_FILTER.mu * r;
  const delta = DEFAULT_FILTER.delta * r;

  it("a sample is clamped into the band, a nearer surface is skipped, the background is clamped behind", () => {
    expect(narrowSample(5.3, 5, mu, delta)).toEqual([5.3, 1]);
    expect(narrowSample(9, 5, mu, delta)).toEqual([6, 1]);
    expect(narrowSample(0, 5, mu, delta)).toEqual([6, 1]);
    expect(narrowSample(4.2, 5, mu, delta)).toEqual([4.2, 1]);
    expect(narrowSample(3, 5, mu, delta)).toEqual([4, 1]);
    expect(narrowSample(-30, 5, mu, delta)[1]).toBe(1); // background (≤ 0) is never "nearer"
    expect(narrowSample(1e-3, 50, mu, delta)).toEqual([0, 0]);
  });

  it("smooths particle bumps without merging two layers or eating into empty pixels", () => {
    // a bumpy near surface at depth 20 (bumps of ±0.4 r) next to a far body at 40
    const row: number[] = [];
    for (let i = 0; i < 60; i += 1) row.push(i < 30 ? 20 + 0.4 * (i % 2 === 0 ? 1 : -1) : 40);
    for (let i = 0; i < 10; i += 1) row.push(0);
    const out = narrowRangeRow(row, 6, mu, delta);
    // bumps shrink
    const amp = (xs: number[]): number => Math.max(...xs.slice(8, 22)) - Math.min(...xs.slice(8, 22));
    expect(amp(out)).toBeLessThan(0.25 * amp(row));
    // the near layer is never pushed back by more than mu at the step, the far layer never pulled forward
    for (let i = 0; i < 30; i += 1) expect(out[i]!).toBeLessThanOrEqual(20.4 + mu + 1e-9);
    for (let i = 30; i < 60; i += 1) expect(out[i]!).toBeGreaterThan(40 - 1e-9);
    // empty pixels stay empty
    for (let i = 60; i < 70; i += 1) expect(out[i]).toBe(0);
    // a flat surface is a fixed point
    const flat = narrowRangeRow(new Array(40).fill(7.5), 9, mu, delta);
    for (const v of flat) expect(v).toBeCloseTo(7.5, 12);
  });
});

describe("liquid uniform", () => {
  it("packs the 144-byte LiquidParams the shader reads", () => {
    const buf = packLiquid(WATER, DEFAULT_FILTER, { radius: 0.01, particleVolume: 1e-6, count: 1234, stride: 4, offset: 0, probe: true }, { w: 640, h: 360 });
    expect(buf.byteLength).toBe(144);
    const f = new Float32Array(buf);
    const u = new Uint32Array(buf);
    expect(f[0]).toBeCloseTo(0.01, 9);
    expect(f[1]).toBeCloseTo(1e-6 / ((4 / 3) * Math.PI * 1e-6), 6);
    expect(Array.from(u.slice(4, 8))).toEqual([1234, 4, 0, 1]);
    expect(f[8]).toBe(640);
    expect(f[11]).toBeCloseTo(1 / 360, 9);
    // filter radii scale with the particle radius
    expect(f[13]).toBe(Math.fround(DEFAULT_FILTER.radius * 0.01));
    expect(f[15]).toBe(Math.fround(DEFAULT_FILTER.delta * 0.01));
    expect(f[23]).toBe(Math.fround(WATER.f0));
    // the light direction is normalised
    expect(Math.hypot(f[24]!, f[25]!, f[26]!)).toBeCloseTo(1, 6);
  });
});
