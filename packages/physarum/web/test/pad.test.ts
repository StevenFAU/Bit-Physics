import { describe, expect, it } from "vitest";
import CAL from "../src/v2/generated/pad-calibration.json";
import { CORNERS, PAD_N, nearestOffered, padParams, padPointOf, stablePoints } from "../src/v2/pad.js";
import { foodHalo } from "../src/v2/model/sim.js";

describe("personality pad", () => {
  it("maps the corners to the declared ranges", () => {
    expect(padParams({ i: 0, j: 0 })).toEqual({ delta_phi_deg: 22.5, L_move: 2, L_sense: 12, decay_alpha: 0.15, deposit: 5 });
    expect(padParams({ i: PAD_N - 1, j: PAD_N - 1 })).toEqual({ delta_phi_deg: 67.5, L_move: 0.5, L_sense: 24, decay_alpha: 0.05, deposit: 5 });
  });

  it("is monotone along each axis", () => {
    for (let k = 1; k < PAD_N; k += 1) {
      const a = padParams({ i: k - 1, j: 2 });
      const b = padParams({ i: k, j: 2 });
      expect(b.delta_phi_deg).toBeGreaterThan(a.delta_phi_deg);
      expect(b.L_move).toBeLessThan(a.L_move);
      const c = padParams({ i: 2, j: k - 1 });
      const d = padParams({ i: 2, j: k });
      expect(d.L_sense).toBeGreaterThan(c.L_sense);
      expect(d.decay_alpha).toBeLessThan(c.decay_alpha);
    }
  });

  it("finds the pad point of its own parameters, and none for others", () => {
    for (let i = 0; i < PAD_N; i += 1) for (let j = 0; j < PAD_N; j += 1) expect(padPointOf(padParams({ i, j }))).toEqual({ i, j });
    expect(padPointOf({ delta_phi_deg: 45, L_sense: 9, L_move: 1, deposit: 5, decay_alpha: 0.1 })).toBeNull();
  });

  it("names four distinct corners", () => {
    expect(new Set(CORNERS.map((c) => `${c.at.i},${c.at.j}`)).size).toBe(4);
  });

  it("offers per tier exactly the calibrated stable points, and snaps to one", () => {
    for (const tier of ["T1", "T2", "T3"] as const) {
      const pts = (CAL.tiers as Record<string, { points: { i: number; j: number; stable: boolean }[] }>)[tier]!.points;
      expect(pts).toHaveLength(PAD_N * PAD_N);
      const offered = stablePoints(tier);
      expect(offered.size).toBe(pts.filter((p) => p.stable).length);
      for (let i = 0; i < PAD_N; i += 1) {
        for (let j = 0; j < PAD_N; j += 1) {
          const n = nearestOffered({ i, j }, tier);
          if (offered.size) expect(offered.has(`${n.i},${n.j}`)).toBe(true);
        }
      }
    }
  });

  it("calibrated the parameters the pad uses", () => {
    for (const tier of ["T1", "T2", "T3"] as const) {
      const pts = (CAL.tiers as Record<string, { points: { i: number; j: number; params: unknown }[] }>)[tier]!.points;
      for (const p of pts) expect(p.params).toEqual(padParams(p));
    }
  });
});

describe("food halo", () => {
  it("covers where a crumb's own trail could reach the wake threshold", () => {
    // λ = √(1/3 / α); trail ≤ food / α; below 0.1 past λ·ln(food / (0.1 α))
    const a = 0.1;
    const lambda = Math.sqrt(1 / 3 / a);
    expect(foodHalo(40, a)).toBeGreaterThanOrEqual(lambda * Math.log(40 / (a * 0.1)));
    expect(foodHalo(40, 0.05)).toBeGreaterThan(foodHalo(40, 0.15));
    expect(foodHalo(80, a)).toBeGreaterThan(foodHalo(10, a));
  });
});
