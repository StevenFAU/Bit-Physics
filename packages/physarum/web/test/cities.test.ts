import { describe, expect, it } from "vitest";
import { CITIES, isWall, kantoFood, kantoWalls } from "../src/v2/cities.js";

describe("Kantō arena", () => {
  for (const [w, h] of [
    [2728, 1536],
    [744, 424],
    [800, 1736],
  ] as const) {
    it(`puts every city on land, clear of the sea (${w} × ${h})`, () => {
      const walls = kantoWalls(w, h);
      const r = Math.max(3, Math.min(w, h) * 0.007);
      const food = kantoFood(w, h, r);
      expect(food).toHaveLength(CITIES.length);
      for (const [k, f] of food.entries()) {
        // the crumb and a ring of 1.5 radii round it are land
        for (let a = 0; a < 16; a += 1) {
          const x = f.x + Math.cos((a / 16) * Math.PI * 2) * r * 1.5;
          const y = f.y + Math.sin((a / 16) * Math.PI * 2) * r * 1.5;
          expect(isWall(walls, w, x, y), `${CITIES[k]!.name} at ${a}`).toBe(false);
        }
      }
    });
  }

  it("walls off the dish edges, so the periodic dish cannot wrap round", () => {
    const [w, h] = [2728, 1536];
    const walls = kantoWalls(w, h);
    for (let x = 0; x < w; x += 7) {
      expect(isWall(walls, w, x, 0)).toBe(true);
      expect(isWall(walls, w, x, h - 1)).toBe(true);
    }
    for (let y = 0; y < h; y += 7) {
      expect(isWall(walls, w, 0, y)).toBe(true);
      expect(isWall(walls, w, w - 1, y)).toBe(true);
    }
  });
});
