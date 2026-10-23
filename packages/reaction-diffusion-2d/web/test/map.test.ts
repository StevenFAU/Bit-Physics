import { describe, expect, it } from "vitest";
import { MAP_F, mapChem, mapUv, saddleNode } from "../src/v2/scenes/map.js";
import { REGIMES } from "../src/v2/scenes/scenes.js";
import { gridFor } from "../src/v2/model/grid.js";
import { chemistryAt } from "../src/v2/model/sim.js";
import type { Chemistry } from "../src/v2/model/sim.js";
import { applyEvent } from "../src/v2/model/runner.js";
import type { LiveSim } from "../src/v2/model/sim.js";

describe("The Map's geometry", () => {
  it("mapUv inverts mapChem", () => {
    for (const [u, v] of [[0, 0], [0.3, 0.7], [1, 1], [0.5, 0.5]] as const) {
      const [F, k] = mapChem(u, v);
      const [u2, v2] = mapUv(F, k);
      expect(u2).toBeCloseTo(u, 10);
      expect(v2).toBeCloseTo(v, 10);
    }
  });

  it("F rises left → right and k rises bottom → top in every column", () => {
    expect(mapChem(1, 0.5)[0]).toBeGreaterThan(mapChem(0, 0.5)[0]);
    for (const u of [0, 0.5, 1]) expect(mapChem(u, 0)[1]).toBeGreaterThan(mapChem(u, 1)[1]);
    expect(mapChem(0, 0.5)[0]).toBeCloseTo(MAP_F[0], 12);
  });

  it("the window brackets the saddle-node line", () => {
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      const [F] = mapChem(u, 0.5);
      expect(mapChem(u, 0)[1]).toBeGreaterThan(saddleNode(F));
      expect(mapChem(u, 1)[1]).toBeLessThan(saddleNode(F));
    }
  });

  it("the map-labelled regimes are inside the band", () => {
    const onMap = REGIMES.filter((r) => r.id !== "solitons");
    for (const r of onMap) {
      const [u, v] = mapUv(r.F, r.k);
      expect(u, r.id).toBeGreaterThanOrEqual(0);
      expect(u, r.id).toBeLessThanOrEqual(1);
      expect(v, r.id).toBeGreaterThanOrEqual(0);
      expect(v, r.id).toBeLessThanOrEqual(1);
    }
  });
});

describe("dive continuity", () => {
  const w = 1296;
  const h = 808;
  const base: Chemistry = {
    model: "gray-scott", c: 0,
    Du: 0.16, Dv: 0.08, dt: 1, dx: 1,
    F0: mapChem(0.5, 0.5)[0], k0: mapChem(0.5, 0.5)[1],
    sweep: { anchorU: 0.5, anchorV: 0.5 }, reveal: null,
  };

  it("the map's chemistry matches mapChem before any dive", () => {
    const [F, k] = chemistryAt(base, w, h, 300.2, 100.7, 0);
    const [eF, ek] = mapChem(300.5 / w, 100.5 / h);
    expect(F).toBeCloseTo(eF, 12);
    expect(k).toBeCloseTo(ek, 12);
  });

  it("a dive changes nothing at the moment it starts, then spreads the dived-in chemistry", () => {
    const sim = { chem: base, w, h, tick: 500 } as unknown as LiveSim;
    const target = chemistryAt(base, w, h, 900, 400, 500);
    applyEvent(sim, { id: 1, tick: 500, kind: "dive", payload: { g: 1, x: 900, y: 400 } });
    // far from the point, at the dive's first tick: unchanged
    for (const [x, y] of [[10, 10], [1200, 700], [100, 650]] as const) {
      const before = chemistryAt(base, w, h, x, y, 500);
      const after = chemistryAt(sim.chem, w, h, x, y, 500);
      expect(after[0]).toBeCloseTo(before[0], 12);
      expect(after[1]).toBeCloseTo(before[1], 12);
    }
    // at the point it is the dived-in chemistry; much later, it is everywhere
    expect(chemistryAt(sim.chem, w, h, 900, 400, 500)[0]).toBeCloseTo(target[0], 12);
    const later = chemistryAt(sim.chem, w, h, 10, 10, 500 + 2000);
    expect(later[0]).toBeCloseTo(target[0], 12);
    expect(later[1]).toBeCloseTo(target[1], 12);
  });
});

describe("grid sizing", () => {
  it("matches the viewport's shape within the tier budget, ~1 cell per CSS px at most", () => {
    const [w, h] = gridFor("T3", 1440, 900);
    expect(w * h).toBeLessThanOrEqual(1024 * 1024 * 1.02);
    expect(w / h).toBeCloseTo(1.6, 1);
    const [pw, ph] = gridFor("T3", 390, 844);
    expect(pw * ph).toBeLessThanOrEqual(390 * 844 * 1.05);
    expect(pw % 8).toBe(0);
    expect(ph % 8).toBe(0);
  });
});
