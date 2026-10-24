// The Maze (02-physarum.md § Scenes, after Nakagaki, Yamada & Tóth 2000): a
// maze whose walls the agents cannot cross, food at the entrance and at the
// exit. In the experiment the plasmodium filled the maze, withdrew from the
// dead ends, and left a single tube along the shortest route between the two
// food sources.
//
// The maze is a perfect maze (randomised depth-first search from the seed)
// with a few extra openings, so that more than one route joins entrance and
// exit and "the shortest" is a real choice; a layout is kept only when its
// shortest route is unique and another route is no more than 1.6× longer.
// The shortest path is then measured through the actual walls (an 8-way
// geodesic on a coarse grid), so it stays right when the visitor adds walls.

import { hash3, unit } from "@bp/runtime";
import type { Spot } from "./model/sim.js";

export interface Maze {
  nx: number;
  ny: number;
  /** Cell pitch and the maze's top-left corner, dish cells. */
  pitch: number;
  x0: number;
  y0: number;
  /** Wall thickness, dish cells. */
  wall: number;
  /** open[j][i]: right / down passages from cell (i, j). */
  right: boolean[][];
  down: boolean[][];
  entrance: [number, number];
  exit: [number, number];
  /** The shortest route through the maze's cells (cell indices), entrance to exit. */
  route: [number, number][];
}

/** Maze cells across and down on a w × h dish (16:9 → 9 × 5). */
export function mazeShape(w: number, h: number, rows = MAZE_ROWS): { nx: number; ny: number } {
  const ny = rows;
  return { ny, nx: Math.max(3, Math.min(25, Math.round((ny * w) / h))) };
}

/** Rows of maze cells, and the wall's share of the cell pitch. */
export const MAZE_ROWS = 4;
export const MAZE_WALL = 0.55;

export function makeMaze(w: number, h: number, seed: number, rows = MAZE_ROWS, wallFrac = MAZE_WALL): Maze {
  const { nx, ny } = mazeShape(w, h, rows);
  const pitch = Math.min((w * 0.94) / nx, (h * 0.94) / ny);
  const x0 = (w - nx * pitch) / 2;
  const y0 = (h - ny * pitch) / 2;
  const entrance: [number, number] = [0, Math.floor(ny / 2)];
  const exit: [number, number] = [nx - 1, Math.floor(ny / 2)];
  for (let attempt = 0; attempt < 64; attempt += 1) {
    let r = 0;
    const rnd = (): number => unit(hash3(seed, attempt, r++));
    const right = Array.from({ length: ny }, () => Array<boolean>(nx).fill(false));
    const down = Array.from({ length: ny }, () => Array<boolean>(nx).fill(false));
    // perfect maze: randomised depth-first search
    const seen = Array.from({ length: ny }, () => Array<boolean>(nx).fill(false));
    const stack: [number, number][] = [[0, 0]];
    seen[0]![0] = true;
    while (stack.length) {
      const [i, j] = stack[stack.length - 1]!;
      const opts: [number, number][] = [];
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const a = i + di;
        const b = j + dj;
        if (a >= 0 && b >= 0 && a < nx && b < ny && !seen[b]![a]) opts.push([a, b]);
      }
      if (!opts.length) {
        stack.pop();
        continue;
      }
      const [a, b] = opts[Math.floor(rnd() * opts.length)]!;
      open(right, down, i, j, a, b);
      seen[b]![a] = true;
      stack.push([a, b]);
    }
    // a few extra openings make loops: more than one route
    const extra = Math.max(2, Math.round((nx * ny) / 12));
    for (let k = 0; k < extra * 8 && countExtra(right, down, nx, ny) < extra; k += 1) {
      const i = Math.floor(rnd() * nx);
      const j = Math.floor(rnd() * ny);
      if (rnd() < 0.5 && i + 1 < nx) right[j]![i] = true;
      else if (j + 1 < ny) down[j]![i] = true;
    }
    const routes = shortestRoutes(right, down, nx, ny, entrance, exit);
    if (routes.count !== 1 || routes.second === Infinity || routes.second > 1.6 * routes.best || routes.best < nx - 1) continue;
    return { nx, ny, pitch, x0, y0, wall: pitch * wallFrac, right, down, entrance, exit, route: routes.path };
  }
  throw new Error("no maze with a unique shortest route");
}

function open(right: boolean[][], down: boolean[][], i: number, j: number, a: number, b: number): void {
  if (a === i + 1) right[j]![i] = true;
  else if (a === i - 1) right[j]![a] = true;
  else if (b === j + 1) down[j]![i] = true;
  else down[b]![i] = true;
}

function countExtra(right: boolean[][], down: boolean[][], nx: number, ny: number): number {
  // a perfect maze has nx·ny − 1 passages; anything more is a loop
  let n = 0;
  for (let j = 0; j < ny; j += 1) for (let i = 0; i < nx; i += 1) n += (right[j]![i] ? 1 : 0) + (down[j]![i] ? 1 : 0);
  return n - (nx * ny - 1);
}

/** Shortest route length (in cells) and how many shortest routes there are; and the next-shortest via a different first-differing route. */
function shortestRoutes(
  right: boolean[][],
  down: boolean[][],
  nx: number,
  ny: number,
  from: [number, number],
  to: [number, number],
): { best: number; count: number; second: number; path: [number, number][] } {
  const id = (i: number, j: number): number => j * nx + i;
  const adj: number[][] = Array.from({ length: nx * ny }, () => []);
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      if (i + 1 < nx && right[j]![i]) adj[id(i, j)]!.push(id(i + 1, j)), adj[id(i + 1, j)]!.push(id(i, j));
      if (j + 1 < ny && down[j]![i]) adj[id(i, j)]!.push(id(i, j + 1)), adj[id(i, j + 1)]!.push(id(i, j));
    }
  }
  const bfs = (src: number): { d: number[]; c: number[] } => {
    const d = Array<number>(nx * ny).fill(Infinity);
    const c = Array<number>(nx * ny).fill(0);
    d[src] = 0;
    c[src] = 1;
    const q = [src];
    for (let k = 0; k < q.length; k += 1) {
      const u = q[k]!;
      for (const v of adj[u]!) {
        if (d[v] === Infinity) {
          d[v] = d[u]! + 1;
          q.push(v);
        }
        if (d[v] === d[u]! + 1) c[v]! += c[u]!;
      }
    }
    return { d, c };
  };
  const s = id(...from);
  const t = id(...to);
  const A = bfs(s);
  const B = bfs(t);
  const best = A.d[t]!;
  // the shortest route that leaves the best route somewhere: min over passages not on it
  const path: [number, number][] = [];
  let u = s;
  const onPath = new Set<number>([s]);
  path.push(from);
  while (u !== t) {
    const v = adj[u]!.find((w) => A.d[w] === A.d[u]! + 1 && A.d[w]! + B.d[w]! === best)!;
    onPath.add(v);
    path.push([v % nx, Math.floor(v / nx)]);
    u = v;
  }
  let second = Infinity;
  for (let a = 0; a < nx * ny; a += 1) {
    for (const b of adj[a]!) {
      if (onPath.has(a) && onPath.has(b) && Math.abs(A.d[a]! - A.d[b]!) === 1) continue;
      const len = A.d[a]! + 1 + B.d[b]!;
      if (len > best && len < second) second = len;
    }
  }
  return { best, count: A.c[t]!, second, path };
}

/** The maze's walls on a w × h dish, one bit per cell. */
export function mazeWalls(m: Maze, w: number, h: number): Uint32Array {
  const bits = new Uint32Array(Math.ceil((w * h) / 32)).fill(0xffffffff);
  const clear = (ax: number, ay: number, bx: number, by: number): void => {
    for (let y = Math.max(0, Math.ceil(ay - 0.5)); y <= Math.min(h - 1, Math.floor(by - 0.5)); y += 1) {
      for (let x = Math.max(0, Math.ceil(ax - 0.5)); x <= Math.min(w - 1, Math.floor(bx - 0.5)); x += 1) {
        const c = y * w + x;
        bits[c >> 5]! &= ~(1 << (c & 31));
      }
    }
  };
  const t = m.wall / 2;
  for (let j = 0; j < m.ny; j += 1) {
    for (let i = 0; i < m.nx; i += 1) {
      const ax = m.x0 + i * m.pitch + t;
      const ay = m.y0 + j * m.pitch + t;
      const bx = m.x0 + (i + 1) * m.pitch - t;
      const by = m.y0 + (j + 1) * m.pitch - t;
      clear(ax, ay, bx, by);
      if (m.right[j]![i]) clear(bx - 1, ay, bx + 2 * t + 1, by);
      if (m.down[j]![i]) clear(ax, by - 1, bx, by + 2 * t + 1);
    }
  }
  return bits;
}

/** Food at the entrance and exit: one crumb in the middle of each end cell. */
export function mazeFood(m: Maze, r: number): Spot[] {
  const at = ([i, j]: [number, number]): Spot => ({ x: m.x0 + (i + 0.5) * m.pitch, y: m.y0 + (j + 0.5) * m.pitch, r });
  return [at(m.entrance), at(m.exit)];
}

/** Which maze cell a dish point is in (or null outside the maze). */
export function mazeCellAt(m: Maze, x: number, y: number): [number, number] | null {
  const i = Math.floor((x - m.x0) / m.pitch);
  const j = Math.floor((y - m.y0) / m.pitch);
  return i >= 0 && j >= 0 && i < m.nx && j < m.ny ? [i, j] : null;
}

/**
 * Shortest path from a to b through the free (non-wall) cells: an 8-way
 * geodesic on a grid of `step`-cell blocks (a block is free if its centre
 * is). Returns the length in dish cells and the path's points, or Infinity
 * when the walls separate them.
 */
export function geodesic(walls: Uint32Array, w: number, h: number, a: [number, number], b: [number, number], step = 4): { length: number; path: number[] } {
  const gw = Math.ceil(w / step);
  const gh = Math.ceil(h / step);
  const free = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const cx = Math.min(w - 1, Math.floor((x + 0.5) * step));
      const cy = Math.min(h - 1, Math.floor((y + 0.5) * step));
      const c = cy * w + cx;
      free[y * gw + x] = (walls[c >> 5]! & (1 << (c & 31))) === 0 ? 1 : 0;
    }
  }
  const g = (p: [number, number]): number => Math.min(gh - 1, Math.floor(p[1] / step)) * gw + Math.min(gw - 1, Math.floor(p[0] / step));
  const src = g(a);
  const dst = g(b);
  const d = new Float64Array(gw * gh).fill(Infinity);
  const from = new Int32Array(gw * gh).fill(-1);
  d[src] = 0;
  // Dijkstra with a binary heap
  const heap: [number, number][] = [[0, src]];
  const push = (e: [number, number]): void => {
    heap.push(e);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p]![0] <= heap[k]![0]) break;
      [heap[p], heap[k]] = [heap[k]!, heap[p]!];
      k = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k]!, heap[m]!];
        k = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [du, u] = pop();
    if (du > d[u]!) continue;
    if (u === dst) break;
    const ux = u % gw;
    const uy = (u / gw) | 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const vx = ux + dx;
        const vy = uy + dy;
        if (vx < 0 || vy < 0 || vx >= gw || vy >= gh) continue;
        const v = vy * gw + vx;
        if (!free[v]) continue;
        // no corner cutting through a wall block
        if (dx && dy && (!free[uy * gw + vx] || !free[vy * gw + ux])) continue;
        const nd = du + (dx && dy ? Math.SQRT2 : 1);
        if (nd < d[v]!) {
          d[v] = nd;
          from[v] = u;
          push([nd, v]);
        }
      }
    }
  }
  if (!Number.isFinite(d[dst]!)) return { length: Infinity, path: [] };
  const path: number[] = [];
  for (let u = dst; u >= 0; u = from[u]!) path.push(((u % gw) + 0.5) * step, (((u / gw) | 0) + 0.5) * step);
  path.reverse();
  // reverse() flips x,y pairs: restore order
  for (let k = 0; k < path.length; k += 2) [path[k], path[k + 1]] = [path[k + 1]!, path[k]!];
  // measure the path resampled (an 8-way grid path is up to 8% long on oblique lines)
  let length = 0;
  const R = 3;
  let px = path[0]!;
  let py = path[1]!;
  for (let k = R; k < path.length / 2; k += R) {
    length += Math.hypot(path[2 * k]! - px, path[2 * k + 1]! - py);
    px = path[2 * k]!;
    py = path[2 * k + 1]!;
  }
  length += Math.hypot(path[path.length - 2]! - px, path[path.length - 1]! - py);
  return { length, path };
}
