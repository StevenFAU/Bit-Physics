import { describe, expect, it } from "vitest";
import { geodesic, makeMaze, mazeCellAt, mazeFood, mazeWalls } from "../src/v2/maze.js";

const isWall = (bits: Uint32Array, w: number, x: number, y: number): boolean => {
  const c = Math.floor(y) * w + Math.floor(x);
  return (bits[c >> 5]! & (1 << (c & 31))) !== 0;
};

describe("maze", () => {
  for (const seed of [1, 2, 3, 7, 11]) {
    it(`seed ${seed}: a unique shortest route, food clear of walls, a geodesic between them`, () => {
      const [w, h] = [1368, 768];
      const m = makeMaze(w, h, seed);
      expect(m.route[0]).toEqual(m.entrance);
      expect(m.route[m.route.length - 1]).toEqual(m.exit);
      const walls = mazeWalls(m, w, h);
      const food = mazeFood(m, 6);
      for (const f of food) expect(isWall(walls, w, f.x, f.y)).toBe(false);
      const g = geodesic(walls, w, h, [food[0]!.x, food[0]!.y], [food[1]!.x, food[1]!.y]);
      expect(Number.isFinite(g.length)).toBe(true);
      expect(g.length).toBeGreaterThanOrEqual(Math.hypot(food[1]!.x - food[0]!.x, food[1]!.y - food[0]!.y) - 1);
      // the geodesic runs through the maze cells of the shortest route
      const cells = new Set<string>();
      for (let k = 0; k < g.path.length; k += 2) {
        const c = mazeCellAt(m, g.path[k]!, g.path[k + 1]!);
        if (c) cells.add(`${c[0]},${c[1]}`);
      }
      for (const [i, j] of m.route) expect(cells.has(`${i},${j}`)).toBe(true);
    });
  }

  it("a wall across the shortest route makes the geodesic longer (or cuts it)", () => {
    const [w, h] = [1368, 768];
    const m = makeMaze(w, h, 1);
    const walls = mazeWalls(m, w, h);
    const food = mazeFood(m, 6);
    const a: [number, number] = [food[0]!.x, food[0]!.y];
    const b: [number, number] = [food[1]!.x, food[1]!.y];
    const before = geodesic(walls, w, h, a, b).length;
    // block the second cell of the route
    const [i, j] = m.route[2]!;
    const blocked = walls.slice();
    for (let y = Math.floor(m.y0 + j * m.pitch); y < m.y0 + (j + 1) * m.pitch; y += 1) {
      for (let x = Math.floor(m.x0 + i * m.pitch); x < m.x0 + (i + 1) * m.pitch; x += 1) {
        const c = y * w + x;
        blocked[c >> 5]! |= 1 << (c & 31);
      }
    }
    const after = geodesic(blocked, w, h, a, b).length;
    expect(after).toBeGreaterThan(before);
  });
});
