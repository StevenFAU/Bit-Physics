// The planner's networks on the same nodes (02-physarum.md § Connect the
// Cities): the exact Euclidean minimum spanning tree, and a Steiner tree from
// a standard heuristic — never claimed optimal.
//
// Steiner heuristic: start from the MST; wherever two edges meet at a node at
// less than 120°, join the three endpoints through a new Steiner point at
// their Fermat point (which shortens the tree); repeat until no angle is
// below 120°, then relax every Steiner point to the geometric median of its
// neighbours (Weiszfeld) and drop the ones that collapse onto a neighbour.
// Every accepted move shortens the tree, so it ends at or below the MST.

export type Pt = [number, number];

export interface Tree {
  /** Terminals first, then Steiner points. */
  pts: Pt[];
  edges: [number, number][];
  length: number;
}

const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Exact Euclidean MST (Prim, O(n²)). */
export function mst(pts: readonly Pt[]): Tree {
  const n = pts.length;
  const edges: [number, number][] = [];
  if (n < 2) return { pts: pts.map((p) => [p[0], p[1]]), edges, length: 0 };
  const inTree = new Uint8Array(n);
  const best = new Float64Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  best[0] = 0;
  let length = 0;
  for (let k = 0; k < n; k += 1) {
    let u = -1;
    for (let i = 0; i < n; i += 1) if (!inTree[i] && (u < 0 || best[i]! < best[u]!)) u = i;
    inTree[u] = 1;
    if (from[u]! >= 0) {
      edges.push([from[u]!, u]);
      length += best[u]!;
    }
    for (let v = 0; v < n; v += 1) {
      if (inTree[v]) continue;
      const d = dist(pts[u]!, pts[v]!);
      if (d < best[v]!) {
        best[v] = d;
        from[v] = u;
      }
    }
  }
  return { pts: pts.map((p) => [p[0], p[1]]), edges, length };
}

/** Fermat (Torricelli) point of a triangle: the point minimising the sum of distances to a, b, c. */
export function fermat(a: Pt, b: Pt, c: Pt): Pt {
  // an angle ≥ 120° puts the Fermat point at that vertex
  const ang = (p: Pt, q: Pt, r: Pt): number => {
    const u = [q[0] - p[0], q[1] - p[1]];
    const v = [r[0] - p[0], r[1] - p[1]];
    const d = Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!);
    return d > 0 ? Math.acos(Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]!) / d))) : 0;
  };
  const T = (2 * Math.PI) / 3;
  if (ang(a, b, c) >= T) return [a[0], a[1]];
  if (ang(b, a, c) >= T) return [b[0], b[1]];
  if (ang(c, a, b) >= T) return [c[0], c[1]];
  return median([a, b, c], [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]);
}

/** Geometric median of points (Weiszfeld), from a start. */
function median(ps: readonly Pt[], start: Pt, iters = 200): Pt {
  let x = start[0];
  let y = start[1];
  for (let k = 0; k < iters; k += 1) {
    let nx = 0;
    let ny = 0;
    let wsum = 0;
    for (const p of ps) {
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < 1e-9) return [p[0], p[1]];
      nx += p[0] / d;
      ny += p[1] / d;
      wsum += 1 / d;
    }
    const tx = nx / wsum;
    const ty = ny / wsum;
    if (Math.hypot(tx - x, ty - y) < 1e-9) break;
    x = tx;
    y = ty;
  }
  return [x, y];
}

function treeLength(pts: readonly Pt[], edges: readonly [number, number][]): number {
  return edges.reduce((s, [a, b]) => s + dist(pts[a]!, pts[b]!), 0);
}

/** A Steiner tree on `terminals` by MST + Fermat-point insertion + Weiszfeld relaxation (a heuristic). */
export function steiner(terminals: readonly Pt[]): Tree {
  const base = mst(terminals);
  const n = terminals.length;
  const pts: Pt[] = base.pts.map((p) => [p[0], p[1]]);
  let edges: [number, number][] = base.edges.map((e) => [e[0], e[1]]);
  const nbrs = (v: number): number[] => edges.filter((e) => e[0] === v || e[1] === v).map((e) => (e[0] === v ? e[1] : e[0]));
  const angleAt = (v: number, a: number, b: number): number => {
    const u = [pts[a]![0] - pts[v]![0], pts[a]![1] - pts[v]![1]];
    const w = [pts[b]![0] - pts[v]![0], pts[b]![1] - pts[v]![1]];
    const d = Math.hypot(u[0]!, u[1]!) * Math.hypot(w[0]!, w[1]!);
    return d > 0 ? Math.acos(Math.max(-1, Math.min(1, (u[0]! * w[0]! + u[1]! * w[1]!) / d))) : Math.PI;
  };
  // relax every Steiner point to the geometric median of its neighbours (Weiszfeld, all at once)
  const relax = (): void => {
    for (let it = 0; it < 3000; it += 1) {
      let moved = 0;
      for (let s = n; s < pts.length; s += 1) {
        const nb = nbrs(s).map((k) => pts[k]!);
        if (nb.length < 2) continue;
        const m = median(nb, pts[s]!, 1);
        moved = Math.max(moved, dist(m, pts[s]!));
        pts[s] = m;
      }
      if (moved < 1e-10) break;
    }
  };
  // drop Steiner points that collapsed onto a neighbour or kept only two links
  const drop = (): boolean => {
    let any = false;
    let changed = true;
    while (changed) {
      changed = false;
      for (let s = n; s < pts.length; s += 1) {
        const nb = nbrs(s);
        if (nb.length === 0) continue;
        const near = nb.find((k) => dist(pts[k]!, pts[s]!) < 1e-7);
        if (nb.length <= 2 || near !== undefined) {
          const keep = near ?? nb[0]!;
          edges = edges.filter((e) => e[0] !== s && e[1] !== s);
          for (const k of nb) if (k !== keep) edges.push([keep, k]);
          changed = true;
          any = true;
        }
      }
    }
    return any;
  };
  // insertion: take the best improvement each round, then let the Steiner points settle
  for (let round = 0; round < 4 * n; round += 1) {
    let best: { v: number; a: number; b: number; s: Pt; gain: number } | null = null;
    for (let v = 0; v < pts.length; v += 1) {
      const nb = nbrs(v);
      for (let i = 0; i < nb.length; i += 1) {
        for (let j = i + 1; j < nb.length; j += 1) {
          const a = nb[i]!;
          const b = nb[j]!;
          if (angleAt(v, a, b) >= (2 * Math.PI) / 3 - 1e-9) continue;
          const s = fermat(pts[v]!, pts[a]!, pts[b]!);
          const before = dist(pts[v]!, pts[a]!) + dist(pts[v]!, pts[b]!);
          const after = dist(s, pts[v]!) + dist(s, pts[a]!) + dist(s, pts[b]!);
          const gain = before - after;
          if (gain > 1e-9 && (!best || gain > best.gain)) best = { v, a, b, s, gain };
        }
      }
    }
    if (!best) break;
    const sIdx = pts.length;
    pts.push(best.s);
    const { v, a, b } = best;
    edges = edges.filter((e) => !((e[0] === v && (e[1] === a || e[1] === b)) || (e[1] === v && (e[0] === a || e[0] === b))));
    edges.push([sIdx, v], [sIdx, a], [sIdx, b]);
    relax();
    while (drop()) relax();
  }
  const length = treeLength(pts, edges);
  // never worse than the MST it started from
  if (length > base.length) return base;
  return { pts, edges, length };
}

/** All-pairs mean of tree/graph shortest-path distances between the first `n` nodes (Dijkstra per node). */
export function meanPairDistance(nodeCount: number, edges: readonly { a: number; b: number; len: number }[], terminals: readonly number[]): number {
  const adj: { to: number; len: number }[][] = Array.from({ length: nodeCount }, () => []);
  for (const e of edges) {
    adj[e.a]!.push({ to: e.b, len: e.len });
    adj[e.b]!.push({ to: e.a, len: e.len });
  }
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < terminals.length; i += 1) {
    const d = dijkstra(adj, terminals[i]!);
    for (let j = i + 1; j < terminals.length; j += 1) {
      const v = d[terminals[j]!]!;
      if (!Number.isFinite(v)) return Infinity;
      sum += v;
      pairs += 1;
    }
  }
  return pairs > 0 ? sum / pairs : 0;
}

export function dijkstra(adj: readonly { to: number; len: number }[][], src: number): Float64Array {
  const d = new Float64Array(adj.length).fill(Infinity);
  const done = new Uint8Array(adj.length);
  d[src] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < adj.length; i += 1) if (!done[i] && Number.isFinite(d[i]!) && (u < 0 || d[i]! < d[u]!)) u = i;
    if (u < 0) break;
    done[u] = 1;
    for (const { to, len } of adj[u]!) if (d[u]! + len < d[to]!) d[to] = d[u]! + len;
  }
  return d;
}

/** A tree's edges in the {a, b, len} form the network measures use. */
export function treeEdges(t: Tree): { a: number; b: number; len: number }[] {
  return t.edges.map(([a, b]) => ({ a, b, len: dist(t.pts[a]!, t.pts[b]!) }));
}
