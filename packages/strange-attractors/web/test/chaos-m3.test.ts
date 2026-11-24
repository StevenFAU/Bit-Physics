// Chaos v2 M3 — The Family's f64 side, Rössler's road, Listen's trajectory.
import { describe, expect, it } from "vitest";
import { ATTRACTORS } from "../src/attractors.js";
import { FAMILY, familyFrame, familySystem, familyTrajectory, field64 } from "../src/v2/model/family.js";
import { CLASSIC, field } from "../src/v2/model/lorenz.js";
import { RY0, RY1, bifStartRossler } from "../src/v2/model/bifurcation.js";
import { rosslerPeaksF64 } from "../src/v2/proof/m3-proofs.js";
import { ListenTrajectory, cutoffOf, pitchOf } from "../src/v2/listen.js";
import { DT, rk4Step } from "../src/v2/model/lorenz.js";
import type { V3 } from "../src/v2/model/lorenz.js";

describe("The Family", () => {
  it("is v1's registry: nine systems, the same parameters, Δt and starts", () => {
    expect(FAMILY.map((f) => f.key)).toEqual(ATTRACTORS.map((a) => a.key));
    expect(FAMILY.length).toBe(9);
    for (const f of FAMILY) {
      const a = ATTRACTORS.find((x) => x.key === f.key)!;
      expect(f.params).toEqual(a.params.map((p) => p.canonical));
      expect(f.dt).toBe(a.dt);
      expect(f.ic).toEqual([...a.ic]);
      expect(f.id).toBe(a.fieldId);
      expect(f.palette.length).toBe(4);
      expect(f.palette.flat().every((v) => v >= 0 && v <= 1)).toBe(true);
    }
  });

  it("Lorenz's row is Lorenz's field", () => {
    const s: V3 = [1.5, -2, 20];
    const L = familySystem("lorenz");
    expect(field64(L.id, L.params, s)).toEqual(field(CLASSIC, s));
  });

  it("every system stays bounded on its attractor and has a finite size and speed", () => {
    for (const f of FAMILY) {
      const pts = familyTrajectory(f, f.params, 2000, 10, 2000);
      expect(pts.every(Number.isFinite)).toBe(true);
      const fr = familyFrame(f, f.params, pts);
      expect(fr.rms).toBeGreaterThan(0.1);
      expect(fr.rms).toBeLessThan(50);
      expect(fr.speed).toBeGreaterThan(0);
    }
  });

  it("family.wgsl's polynomial sine (same formula, f64) is within 6e-8 over the states Thomas reaches", () => {
    // mirrors psin() in src/v2/model/family.wgsl
    const psin = (x: number): number => {
      const k = Math.floor(x * 0.15915494309189535 + 0.5);
      let r = x - k * 6.28125 - k * 0.0019353071795864769;
      if (r > 1.5707963267948966) r = 3.141592653589793 - r;
      if (r < -1.5707963267948966) r = -3.141592653589793 - r;
      const r2 = r * r;
      return r * (1 + r2 * (-0.16666666666666666 + r2 * (0.008333333333333333 + r2 * (-0.0001984126984126984 + r2 * (2.7557319223985893e-6 + r2 * -2.505210838544172e-8)))));
    };
    let worst = 0;
    for (let x = -12; x <= 12; x += 0.0007) worst = Math.max(worst, Math.abs(psin(x) - Math.sin(x)));
    // the first dropped Taylor term, (π/2)¹³ / 13! ≈ 5.7e-8, bounds it
    expect(worst).toBeLessThan(6e-8);
    const T = familySystem("thomas");
    const pts = familyTrajectory(T, T.params, 2000, 10, 500);
    expect(Math.max(...pts.map(Math.abs))).toBeLessThan(12);
  });
});

describe("Rössler's road", () => {
  it("doubles its period: one peak at c 2.5, two at 3.5, four at 4, a smear at 5.7", () => {
    const distinct = (c: number): number => new Set(rosslerPeaksF64(c, [1, 1, 0], 15000, 30000).map((v) => v.toFixed(2))).size;
    expect(distinct(2.5)).toBe(1);
    expect(distinct(3.5)).toBe(2);
    expect(distinct(4)).toBeGreaterThanOrEqual(4);
    expect(distinct(4)).toBeLessThanOrEqual(5);
    expect(distinct(5.7)).toBeGreaterThan(40);
  });

  it("peaks divided by c stay inside the diagram's axis, starts inside the attractor's reach", () => {
    for (const c of [2, 4.2, 9, 18]) {
      const pk = rosslerPeaksF64(c, bifStartRossler(1, 3, c), 10000, 30000);
      expect(pk.length).toBeGreaterThan(80);
      expect(Math.min(...pk) / c).toBeGreaterThan(RY0);
      expect(Math.max(...pk) / c).toBeLessThan(RY1);
      const s = bifStartRossler(1, 3, c);
      expect(Math.abs(s[0])).toBeLessThanOrEqual(0.8 * c + 1e-5);
      expect(s[2]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Listen", () => {
  it("counts a switch wherever x changes sign, as an independent f64 run does", () => {
    const L = new ListenTrajectory();
    for (let i = 0; i < 50; i += 1) L.advance(CLASSIC, 240);
    let x: V3 = [1, 1, 20];
    let n = 0;
    for (let i = 0; i < 50 * 240; i += 1) {
      const b = x[0];
      x = rk4Step(CLASSIC, x, DT).next;
      if (b !== 0 && Math.sign(b) !== Math.sign(x[0])) n += 1;
    }
    expect(L.switches).toBe(n);
    expect(n).toBeGreaterThan(20);
    expect(L.t).toBeCloseTo(120, 9);
  });

  it("maps x to pitch and z to brightness, monotonic, in an audible range", () => {
    expect(pitchOf(-20)).toBeGreaterThan(80);
    expect(pitchOf(20)).toBeLessThan(600);
    expect(pitchOf(5)).toBeGreaterThan(pitchOf(-5));
    expect(cutoffOf(45)).toBeGreaterThan(cutoffOf(5));
    expect(cutoffOf(5)).toBe(300);
  });
});
