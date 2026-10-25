import { describe, expect, it } from "vitest";
import { PRESENT, REACH, TILE, territoryFromTiles } from "../src/v2/model/territory.js";
import { colonySites } from "../src/v2/scenes.js";

/** Per-tile strengths (vec4 per tile) from a function of the tile coordinates. */
function tiles(tx: number, ty: number, f: (x: number, y: number) => number[]): Float32Array {
  const out = new Float32Array(tx * ty * 4);
  for (let y = 0; y < ty; y += 1) for (let x = 0; x < tx; x += 1) f(x, y).forEach((v, k) => (out[(y * tx + x) * 4 + k] = v));
  return out;
}

describe("territory from tile strengths", () => {
  it("gives each tile to the strongest colony present, and counts borders", () => {
    const w = TILE * 4;
    const h = TILE * 2;
    const s = tiles(4, 2, (x) => (x < 2 ? [1, 0.3, 0] : [0.1, 2, 0]));
    const t = territoryFromTiles(s, w, h, 3);
    expect(t.held).toEqual([2 * 2 * TILE * TILE, 2 * 2 * TILE * TILE, 0]);
    // colony 1 is present (≥ PRESENT) in the left tiles too: those are borders
    expect(0.3).toBeGreaterThanOrEqual(PRESENT);
    expect(t.border).toBe(4 * TILE * TILE);
  });

  it("spreads into empty tiles up to REACH tiles away, then leaves them unclaimed", () => {
    const tx = 2 * REACH + 4;
    const s = tiles(tx, 1, (x) => (x === 0 ? [1, 0] : [0, 0]));
    const t = territoryFromTiles(s, tx * TILE, TILE, 2);
    // the held tile, plus REACH tiles each way round the periodic row
    expect(t.held[0]).toBe((1 + 2 * REACH) * TILE * TILE);
    expect([...t.owner].filter((o) => o === -1).length).toBe(tx - 1 - 2 * REACH);
  });

  it("weights partial edge tiles by the cells they cover", () => {
    const w = TILE + 10;
    const h = TILE;
    const t = territoryFromTiles(tiles(2, 1, () => [1, 0]), w, h, 2);
    expect(t.held[0]).toBe(w * h);
    expect(t.cells).toBe(w * h);
  });
});

describe("colony release sites", () => {
  // on the periodic dish every colony must see the others at the same offsets: a lattice
  const wrapDelta = (a: number, b: number, n: number): number => {
    const d = (((b - a) % n) + n) % n;
    return Math.min(d, n - d);
  };
  for (const count of [2, 3, 4]) {
    it(`${count} colonies sit on a lattice of the periodic dish (no colony starts cornered)`, () => {
      const w = 2728;
      const h = 1536;
      const { sites } = colonySites(w, h, count);
      expect(sites.length).toBe(count);
      const offsets = sites.map(([x, y]) =>
        sites
          .map(([u, v]) => [wrapDelta(x, u, w), wrapDelta(y, v, h)])
          .map(([a, b]) => Math.round(Math.hypot(a!, b!)))
          .sort((a, b) => a - b)
          .join(","),
      );
      expect(new Set(offsets).size).toBe(1);
    });
  }
});
