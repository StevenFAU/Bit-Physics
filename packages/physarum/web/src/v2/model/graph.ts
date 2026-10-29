// Network extraction (02-physarum.md § The model, "Network extraction"): the
// trail field → a graph between food nodes, so the mould's network can be
// scored against the planner's.
//
//   1. threshold the trail (× its mean at balance) into tube cells; each
//      crumb's disc counts as tube, so tubes that reach a crumb join it;
//   2. thin the tubes to one-cell-wide lines (Zhang & Suen 1984);
//   3. nodes: every crumb (the line cells within its disc and a margin),
//      every junction (a line cell with 3+ neighbours, adjacent ones merged)
//      and every loose end; links: the lines between them, measured along
//      the line resampled every 3 cells;
//   4. prune: links shorter than about a tube's width are contracted into
//      their junctions (thinning leaves small staircase triangles at some
//      junctions, which would count as loops and flatter the network's fault
//      tolerance); dead ends that are not food go (repeatedly), as do pieces
//      with no food; chains through two-link junctions merge into one link.
//
// Measures (Tero et al. 2010, each normalised by the MST on the same nodes):
//   * length — the network's total length (TL);
//   * mean distance — the shortest route along the network between every
//     pair of crumbs, averaged (MD);
//   * cut share — the fraction of single-link failures that cut a crumb off
//     (Tero report 4% for the Tokyo rail network, 14 ± 4% and 20 ± 13% for
//     illuminated and unconstrained Physarum networks; an MST has 100%).
// The score is only as good as the extraction: the graph is drawn over the
// dish so it can be inspected.

import { dijkstra, meanPairDistance } from "./netopt.js";
import type { Spot } from "./sim.js";

export interface NetNode {
  x: number;
  y: number;
  /** Food index, or −1 for a junction. */
  food: number;
}

export interface NetLink {
  a: number;
  b: number;
  len: number;
  /** The line's cells, x0 y0 x1 y1 … (dish cells), for drawing. */
  path: number[];
}

export interface NetGraph {
  nodes: NetNode[];
  links: NetLink[];
  /** Node index of each food crumb (−1: no tube reaches it). */
  foodNode: number[];
  /** All the tube's length before pruning, dead ends included (cells): how much is left anywhere. */
  rawLength?: number;
}

export interface NetScore {
  /** Crumbs the network reaches (in its largest food-carrying piece). */
  reached: number;
  food: number;
  /** Total length of the piece(s) carrying food, cells. */
  length: number;
  /** Mean shortest distance along the network over all crumb pairs (Infinity unless every crumb is reached). */
  meanDistance: number;
  links: number;
  /** Links whose loss alone cuts a crumb off. */
  cutLinks: number;
}

export interface ExtractOptions {
  /** Tube threshold, × the mean trail at balance. */
  threshold: number;
  /** Work on a block-averaged field (every `step` cells). */
  step: number;
  /** Extra margin round each crumb that still counts as the crumb, cells. */
  foodMargin: number;
  /** Links shorter than this (cells) are contracted into their junctions. */
  minLink: number;
  /** Return the traced graph as it is — no contraction, no pruning (morphology's degree count). */
  raw?: boolean;
}

/** Tubes are cells above half the dish's measured mean trail (scores barely move between 0.25 and 1; at 1 the faint middle of a long route drops out). */
export const DEFAULT_EXTRACT: ExtractOptions = { threshold: 0.5, step: 1, foodMargin: 4, minLink: 12 };

/** Resample a traced line every this many cells before measuring it. */
const RESAMPLE = 3;

const N8 = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;

/** Zhang–Suen thinning of a binary image in place (the border row/column is left clear). */
export function thin(img: Uint8Array, w: number, h: number, keep?: Uint8Array): void {
  const del: number[] = [];
  let changed = true;
  const P = (x: number, y: number): number => img[y * w + x]!;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass += 1) {
      del.length = 0;
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const i = y * w + x;
          if (!img[i] || keep?.[i]) continue;
          const p2 = P(x, y - 1);
          const p3 = P(x + 1, y - 1);
          const p4 = P(x + 1, y);
          const p5 = P(x + 1, y + 1);
          const p6 = P(x, y + 1);
          const p7 = P(x - 1, y + 1);
          const p8 = P(x - 1, y);
          const p9 = P(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k += 1) if (seq[k] === 0 && seq[k + 1] === 1) a += 1;
          if (a !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0 : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) del.push(i);
        }
      }
      for (const i of del) img[i] = 0;
      if (del.length) changed = true;
    }
  }
}

/**
 * Extract the network from `field` (trail ÷ its mean at balance, w × h,
 * row-major) between the crumbs `food` (dish cells).
 */
export function extractNetwork(field: Float32Array, w: number, h: number, food: readonly Spot[], o: ExtractOptions = DEFAULT_EXTRACT): NetGraph {
  const s = Math.max(1, Math.round(o.step));
  const gw = Math.ceil(w / s);
  const gh = Math.ceil(h / s);
  // 1. threshold (block maximum, so thin tubes survive the downsample)
  const img = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y += 1) {
    const oy = ((y / s) | 0) * gw;
    for (let x = 0; x < w; x += 1) if (field[y * w + x]! > o.threshold) img[oy + ((x / s) | 0)] = 1;
  }
  // crumbs: each is a node whatever the trail says; mark its disc (+ margin) as that food
  const foodOf = new Int32Array(gw * gh).fill(-1);
  food.forEach((f, k) => {
    const R = (f.r + o.foodMargin) / s;
    const cx = f.x / s;
    const cy = f.y / s;
    for (let y = Math.max(1, Math.floor(cy - R)); y <= Math.min(gh - 2, Math.ceil(cy + R)); y += 1) {
      for (let x = Math.max(1, Math.floor(cx - R)); x <= Math.min(gw - 2, Math.ceil(cx + R)); x += 1) {
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= R * R) {
          foodOf[y * gw + x] = k;
          if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= (f.r / s) ** 2) img[y * gw + x] = 1;
        }
      }
    }
  });
  for (let x = 0; x < gw; x += 1) img[x] = img[(gh - 1) * gw + x] = 0;
  for (let y = 0; y < gh; y += 1) img[y * gw] = img[y * gw + gw - 1] = 0;
  // 2. thin
  thin(img, gw, gh);
  // 3. nodes, on the skeleton's m-adjacency (a diagonal step only where no
  // orthogonal path joins the two cells): every line cell then has exactly
  // two neighbours, and the staircases thinning leaves on diagonals are not
  // mistaken for junctions
  const nb = (i: number, out: number[]): number => {
    const x = i % gw;
    const y = (i / gw) | 0;
    let n = 0;
    for (const [dx, dy] of N8) {
      const q = (y + dy) * gw + x + dx;
      if (!img[q]) continue;
      if (dx !== 0 && dy !== 0 && (img[y * gw + x + dx] || img[(y + dy) * gw + x])) continue;
      out[n++] = q;
    }
    return n;
  };
  const tmp = [0, 0, 0, 0, 0, 0, 0, 0];
  const nodeOf = new Int32Array(gw * gh).fill(-1);
  const nodes: NetNode[] = [];
  const foodNode = food.map(() => -1);
  const acc: { sx: number; sy: number; n: number }[] = [];
  const addNode = (fd: number): number => {
    nodes.push({ x: 0, y: 0, food: fd });
    acc.push({ sx: 0, sy: 0, n: 0 });
    return nodes.length - 1;
  };
  // food first: all line cells in a crumb's zone are that crumb's node
  for (let i = 0; i < gw * gh; i += 1) {
    if (!img[i] || foodOf[i]! < 0) continue;
    const k = foodOf[i]!;
    if (foodNode[k] === -1) foodNode[k] = addNode(k);
    nodeOf[i] = foodNode[k]!;
  }
  // junctions (3+ neighbours; touching ones merged) and loose ends (1)
  const nbs = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < gw * gh; i += 1) {
    if (!img[i] || nodeOf[i]! >= 0) continue;
    const d = nb(i, tmp);
    if (d === 2) continue;
    const id = addNode(-1);
    const stack = [i];
    nodeOf[i] = id;
    while (stack.length) {
      const c = stack.pop()!;
      acc[id]!.sx += c % gw;
      acc[id]!.sy += (c / gw) | 0;
      acc[id]!.n += 1;
      if (d < 3) continue;
      const m = nb(c, nbs);
      for (let k = 0; k < m; k += 1) {
        const q = nbs[k]!;
        if (nodeOf[q]! < 0 && foodOf[q]! < 0 && nb(q, tmp) >= 3) {
          nodeOf[q] = id;
          stack.push(q);
        }
      }
    }
  }
  nodes.forEach((n, id) => {
    if (n.food >= 0) {
      n.x = food[n.food]!.x;
      n.y = food[n.food]!.y;
    } else {
      n.x = (acc[id]!.sx / acc[id]!.n + 0.5) * s;
      n.y = (acc[id]!.sy / acc[id]!.n + 0.5) * s;
    }
  });
  // links: from each node cell, walk each line (cells with exactly two neighbours) to the next node
  const seen = new Uint8Array(gw * gh);
  const links: NetLink[] = [];
  const direct = new Map<string, NetLink>();
  const cx = (i: number): number => ((i % gw) + 0.5) * s;
  const cy = (i: number): number => (((i / gw) | 0) + 0.5) * s;
  const step = (a: number, b: number): number => Math.hypot(cx(a) - cx(b), cy(a) - cy(b));
  const out = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < gw * gh; i += 1) {
    const a = nodeOf[i]!;
    if (a < 0) continue;
    const m = nb(i, out);
    for (let k = 0; k < m; k += 1) {
      const q0 = out[k]!;
      if (nodeOf[q0] === a) continue;
      if (nodeOf[q0]! >= 0) {
        // two nodes touching
        const b = nodeOf[q0]!;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        const l = { a, b, len: step(i, q0), path: [cx(i), cy(i), cx(q0), cy(q0)] };
        if (!direct.has(key) || direct.get(key)!.len > l.len) direct.set(key, l);
        continue;
      }
      if (seen[q0]) continue;
      let prev = i;
      let cur = q0;
      let len = step(i, q0);
      const path = [cx(i), cy(i), cx(q0), cy(q0)];
      let end = -1;
      for (;;) {
        seen[cur] = 1;
        const n2 = nb(cur, tmp);
        let next = -1;
        for (let j = 0; j < n2; j += 1) if (tmp[j] !== prev) next = tmp[j]!;
        if (next < 0 || (seen[next] && nodeOf[next]! < 0)) break; // a loop with no node on it
        len += step(cur, next);
        path.push(cx(next), cy(next));
        if (nodeOf[next]! >= 0) {
          end = nodeOf[next]!;
          break;
        }
        prev = cur;
        cur = next;
      }
      if (end >= 0 && end !== a) links.push({ a, b: end, len, path });
    }
  }
  links.push(...direct.values());
  // length along the line resampled every few cells: walked cell by cell, a
  // thinned diagonal is a staircase and would measure up to √2 too long
  for (const l of links) {
    const p = l.path;
    const n = p.length / 2;
    const keep: number[] = [];
    for (let k = 0; k < n; k += RESAMPLE) keep.push(p[2 * k]!, p[2 * k + 1]!);
    if ((n - 1) % RESAMPLE !== 0) keep.push(p[2 * n - 2]!, p[2 * n - 1]!);
    let len = 0;
    for (let k = 2; k < keep.length; k += 2) len += Math.hypot(keep[k]! - keep[k - 2]!, keep[k + 1]! - keep[k - 1]!);
    l.len = len;
    l.path = keep;
  }
  // a link to a crumb runs on to the crumb's centre (the MST it is compared with joins centres)
  for (const l of links) {
    const A = nodes[l.a]!;
    const B = nodes[l.b]!;
    if (A.food >= 0) {
      l.len += Math.hypot(l.path[0]! - A.x, l.path[1]! - A.y);
      l.path.unshift(A.x, A.y);
    }
    if (B.food >= 0) {
      const n = l.path.length;
      l.len += Math.hypot(l.path[n - 2]! - B.x, l.path[n - 1]! - B.y);
      l.path.push(B.x, B.y);
    }
  }
  // before pruning: every traced line, dead ends included (spurs shorter than a link are thinning's noise)
  const rawLength = links.reduce((s, l) => s + (l.len >= o.minLink ? l.len : 0), 0);
  if (o.raw) return { nodes, links, foodNode, rawLength };
  return { ...prune({ nodes, links, foodNode }, o.minLink), rawLength };
}

/** Contract short links, drop dead ends that are not food, merge two-link junctions, keep only what touches food. */
export function prune(g: NetGraph, minLink = 0): NetGraph {
  const nodes = g.nodes;
  const isFood = (n: number): boolean => nodes[n]!.food >= 0;
  // contract short links that touch a junction (two crumbs are never merged)
  const rep = nodes.map((_, i) => i);
  const root = (i: number): number => (rep[i] === i ? i : (rep[i] = root(rep[i]!)));
  for (const l of g.links) {
    if (l.len >= minLink) continue;
    const a = root(l.a);
    const b = root(l.b);
    if (a === b || (isFood(a) && isFood(b))) continue;
    // a crumb absorbs a junction; else the lower index wins
    if (isFood(b) || (!isFood(a) && b < a)) rep[a] = b;
    else rep[b] = a;
  }
  let links = g.links
    .map((l) => ({ ...l, a: root(l.a), b: root(l.b) }))
    .filter((l) => l.a !== l.b && !(l.len < minLink && !(isFood(l.a) && isFood(l.b))));
  for (;;) {
    const d = new Int32Array(nodes.length);
    for (const l of links) {
      d[l.a]! += 1;
      d[l.b]! += 1;
    }
    const before = links.length;
    links = links.filter((l) => !((d[l.a] === 1 && !isFood(l.a)) || (d[l.b] === 1 && !isFood(l.b))));
    if (links.length === before) break;
  }
  // merge chains through junctions left with exactly two links
  for (;;) {
    const at = new Map<number, number[]>();
    links.forEach((l, k) => {
      at.set(l.a, [...(at.get(l.a) ?? []), k]);
      at.set(l.b, [...(at.get(l.b) ?? []), k]);
    });
    let merged = false;
    for (const [n, ks] of at) {
      if (isFood(n) || ks.length !== 2) continue;
      const [p, q] = [links[ks[0]!]!, links[ks[1]!]!];
      if (p === q) continue;
      const pa = p.a === n ? p.b : p.a;
      const qb = q.a === n ? q.b : q.a;
      if (pa === qb && pa === n) continue;
      const pPath = p.b === n ? p.path : reversePath(p.path);
      const qPath = q.a === n ? q.path : reversePath(q.path);
      const m: NetLink = { a: pa, b: qb, len: p.len + q.len, path: [...pPath, ...qPath] };
      links = links.filter((_, k) => k !== ks[0] && k !== ks[1]);
      if (pa !== qb) links.push(m);
      merged = true;
      break;
    }
    if (!merged) break;
  }
  // keep the pieces that carry food
  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (const l of links) parent[find(l.a)] = find(l.b);
  const fed = new Set<number>();
  g.foodNode.forEach((n) => n >= 0 && fed.add(find(n)));
  links = links.filter((l) => fed.has(find(l.a)));
  return { nodes, links, foodNode: g.foodNode };
}

function reversePath(p: number[]): number[] {
  const out: number[] = [];
  for (let k = p.length - 2; k >= 0; k -= 2) out.push(p[k]!, p[k + 1]!);
  return out;
}

/** Score a network: reach, length, mean crumb-to-crumb distance, and the links whose loss cuts a crumb off. */
export function scoreNetwork(g: NetGraph): NetScore {
  const n = g.nodes.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (const l of g.links) parent[find(l.a)] = find(l.b);
  // the piece holding the most crumbs
  const count = new Map<number, number>();
  for (const f of g.foodNode) if (f >= 0) count.set(find(f), (count.get(find(f)) ?? 0) + 1);
  let main = -1;
  let reached = 0;
  for (const [r, c] of count) {
    if (c > reached) {
      reached = c;
      main = r;
    }
  }
  const length = g.links.reduce((s, l) => s + l.len, 0);
  const terminals = g.foodNode.filter((f) => f >= 0 && find(f) === main);
  const all = reached === g.foodNode.length;
  const meanDistance = all ? meanPairDistance(n, g.links, terminals) : Infinity;
  // a link cuts a crumb off if, without it, some reached crumb leaves the main piece
  const mainLinks = g.links.filter((l) => find(l.a) === main);
  let cutLinks = 0;
  for (let k = 0; k < mainLinks.length; k += 1) {
    const adj: { to: number; len: number }[][] = Array.from({ length: n }, () => []);
    mainLinks.forEach((l, j) => {
      if (j === k) return;
      adj[l.a]!.push({ to: l.b, len: 1 });
      adj[l.b]!.push({ to: l.a, len: 1 });
    });
    const d = dijkstra(adj, terminals[0]!);
    if (terminals.some((t) => !Number.isFinite(d[t]!))) cutLinks += 1;
  }
  return { reached, food: g.foodNode.length, length, meanDistance, links: mainLinks.length, cutLinks };
}
