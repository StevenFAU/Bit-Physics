// Scoring a dish (02-physarum.md § Connect the Cities, The Maze): the trail
// read back from the GPU → the mould's network (graph.ts) → measured against
// the planner on the same nodes (netopt.ts) or against the shortest path
// through the maze's walls (maze.ts). Everything here is computed from the
// visitor's own run; reference values from the literature are shown beside
// it, never in place of it.

import type { NetGraph, NetScore } from "./graph.js";
import { DEFAULT_EXTRACT, extractNetwork, scoreNetwork } from "./graph.js";
import type { Tree } from "./netopt.js";
import { dijkstra, meanPairDistance, mst, steiner, treeEdges } from "./netopt.js";
import type { Spot } from "./sim.js";
import type { Maze } from "../maze.js";
import { geodesic, mazeCellAt } from "../maze.js";

export interface CitiesScore {
  kind: "cities";
  /** Length / the MST's length (Tero's TL_MST). */
  tl: number;
  /** Mean crumb-to-crumb distance along the network / the same along the MST (Tero's MD_MST); Infinity unless every crumb is reached. */
  md: number;
  /** Share of links whose loss alone cuts a crumb off (Tero's measure, as a fraction; an MST's is 1). */
  cut: number;
  /** The Steiner heuristic's length / the MST's (≤ 1). */
  steinerRatio: number;
  mst: Tree;
  steiner: Tree;
}

export interface MazeScore {
  kind: "maze";
  /** Shortest path between the two crumbs through the walls (dish cells; Infinity if walled off). */
  shortest: number;
  shortestPath: number[];
  /** Shortest route between the two crumbs along the mould's network (Infinity if not joined). */
  along: number;
  /** The mould's route's maze cells, in order; and whether they are the shortest route's. */
  route: [number, number][];
  onShortest: boolean;
  /** Total network length / its route between the crumbs: 1 when only the route is left. */
  extra: number;
}

export interface Analysis {
  tick: number;
  graph: NetGraph;
  net: NetScore;
  score: CitiesScore | MazeScore | null;
  /** Milliseconds spent on the CPU. */
  ms: number;
}

/** The field the extraction reads: the trail ÷ its measured mean over the open (non-wall) dish. */
export function normalise(trail: Float32Array, walls: Uint32Array | null): Float32Array {
  let sum = 0;
  let n = 0;
  for (let c = 0; c < trail.length; c += 1) {
    if (walls && (walls[c >> 5]! & (1 << (c & 31))) !== 0) continue;
    sum += trail[c]!;
    n += 1;
  }
  const inv = n > 0 && sum > 0 ? n / sum : 0;
  const f = new Float32Array(trail.length);
  for (let c = 0; c < trail.length; c += 1) f[c] = trail[c]! * inv;
  return f;
}

export function analyse(
  trail: Float32Array,
  w: number,
  h: number,
  food: readonly Spot[],
  walls: Uint32Array | null,
  kind: "cities" | "maze" | null,
  maze: Maze | null,
  tick: number,
  step: number,
  threshold = DEFAULT_EXTRACT.threshold,
): Analysis {
  const t0 = performance.now();
  const field = normalise(trail, walls);
  const graph = extractNetwork(field, w, h, food, { ...DEFAULT_EXTRACT, step, threshold });
  const net = scoreNetwork(graph);
  let score: CitiesScore | MazeScore | null = null;
  if (kind === "cities" && food.length >= 2) {
    const pts = food.map((f) => [f.x, f.y] as [number, number]);
    const tree = mst(pts);
    const st = steiner(pts);
    const mdTree = meanPairDistance(tree.pts.length, treeEdges(tree), pts.map((_, i) => i));
    score = {
      kind,
      tl: net.length / tree.length,
      md: net.meanDistance / mdTree,
      cut: net.links > 0 ? net.cutLinks / net.links : 1,
      steinerRatio: st.length / tree.length,
      mst: tree,
      steiner: st,
    };
  } else if (kind === "maze" && maze && walls && food.length >= 2) {
    const g = geodesic(walls, w, h, [food[0]!.x, food[0]!.y], [food[1]!.x, food[1]!.y]);
    // the mould's route: shortest path along its network between the two crumbs
    const a = graph.foodNode[0]!;
    const b = graph.foodNode[1]!;
    let along = Infinity;
    let route: [number, number][] = [];
    if (a >= 0 && b >= 0) {
      const adj: { to: number; len: number }[][] = graph.nodes.map(() => []);
      graph.links.forEach((l) => {
        adj[l.a]!.push({ to: l.b, len: l.len });
        adj[l.b]!.push({ to: l.a, len: l.len });
      });
      const d = dijkstra(adj, a);
      along = d[b]!;
      if (Number.isFinite(along)) route = routeCells(graph, d, a, b, maze);
    }
    const shortestCells = cellsOf(g.path, maze);
    const onShortest = route.length > 0 && route.length === shortestCells.length && route.every((c, k) => c[0] === shortestCells[k]![0] && c[1] === shortestCells[k]![1]);
    score = { kind, shortest: g.length, shortestPath: g.path, along, route, onShortest, extra: Number.isFinite(along) && along > 0 ? net.length / along : Infinity };
  }
  return { tick, graph, net, score, ms: performance.now() - t0 };
}

/** Maze cells a polyline passes through, in order, without repeats. */
function cellsOf(path: readonly number[], m: Maze): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < path.length; k += 2) {
    const c = mazeCellAt(m, path[k]!, path[k + 1]!);
    if (!c) continue;
    const last = out[out.length - 1];
    if (!last || last[0] !== c[0] || last[1] !== c[1]) out.push(c);
  }
  return out;
}

/** The maze cells along the network's shortest route from node a to node b. */
function routeCells(g: NetGraph, d: Float64Array, a: number, b: number, m: Maze): [number, number][] {
  // walk back from b along links that keep the distance consistent
  const pts: number[] = [];
  let u = b;
  let guard = 0;
  while (u !== a && guard++ < g.links.length + 2) {
    const l = g.links.find((k) => (k.a === u || k.b === u) && Math.abs(d[k.a === u ? k.b : k.a]! + k.len - d[u]!) < 1e-6);
    if (!l) break;
    const path = l.b === u ? l.path : reverse(l.path);
    // path runs from the other end to u: prepend it
    pts.unshift(...path);
    u = l.a === u ? l.b : l.a;
  }
  return cellsOf(pts, m);
}

function reverse(p: readonly number[]): number[] {
  const out: number[] = [];
  for (let k = p.length - 2; k >= 0; k -= 2) out.push(p[k]!, p[k + 1]!);
  return out;
}
