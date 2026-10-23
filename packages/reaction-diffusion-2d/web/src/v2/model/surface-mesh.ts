// "On a Shape" (01-reaction-diffusion.md § The model): reaction–diffusion on
// a closed surface through an analytic parameterisation rather than an
// arbitrary triangle mesh — a geodesic icosahedral sphere or a θ × φ torus —
// so every cell, neighbour and weight is exact and distortion-controlled.
//
// The solver sees a graph: each cell has up to six neighbours (ordered
// counter-clockwise around the outward normal) and a finite-volume
// Laplace–Beltrami operator
//
//   Δf_i ≈ Σ_k w_ik (f_k − f_i),   w_ik = λ_ik / A_i,   λ_ik = λ_ki
//
// which conserves Σ A_i f_i exactly. Sphere: λ is the cotangent weight
// (cot α + cot β)/2 of the icosahedral triangulation (= Voronoi edge / centre
// distance for its acute triangles) and A the Voronoi area. Torus: the grid is
// orthogonal, so λ is the exact shared-edge length over the centre distance
// and A the exact patch area. (An equiangular cube-sphere with two-point
// fluxes was tried first and measured inconsistent — its grid lines are not
// orthogonal: 25–37% error on spherical harmonics, not shrinking with
// refinement, growing at the face edges.) Lengths are in the model's own
// units (a cell spans about the model's Δx), so flat-dish parameters carry
// over. Cells are also the render vertices, so the surface closes without
// seams.

import type { Vec3 } from "@bp/render";

export type ShapeId = "sphere" | "torus";

/** Neighbour slots per cell (hexagons; pentagons and the torus pad with weight 0). */
export const MAX_NBR = 6;

export interface SurfaceMesh {
  shape: ShapeId;
  cells: number;
  /** Cell centres on the unit-scale shape (world units), xyz + pad. */
  pos: Float32Array<ArrayBuffer>;
  /** Outward unit normals at the cell centres, xyz + pad. */
  nrm: Float32Array<ArrayBuffer>;
  /** 8 per cell: up to six neighbours counter-clockwise about the normal, then the count, then 0. */
  nbr: Uint32Array<ArrayBuffer>;
  /** 8 per cell: the Laplacian weight w_ik of each neighbour (model units), 0 for padding. */
  wts: Float32Array<ArrayBuffer>;
  /** Cell area, model units². */
  area: Float64Array;
  /** Model length units per world unit. */
  scale: number;
  /** max_i Σ_k w_ik: Gershgorin bounds the Laplacian's spectrum by 2·this (explicit-step stability). */
  maxRowSum: number;
  /** Render triangles over the cells. */
  indices: Uint32Array<ArrayBuffer>;
  /** The cell under a world-space ray, or −1. */
  pick(origin: Vec3, dir: Vec3): number;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => scl(a, 1 / len(a));
/** cot of the angle at `o` in the triangle (o, a, b). */
const cotAt = (o: Vec3, a: Vec3, b: Vec3): number => {
  const u = sub(a, o);
  const v = sub(b, o);
  return dot(u, v) / len(cross(u, v));
};

// ------------------------------------------------------------- icosphere --

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V: Vec3[] = (
  [
    [-1, PHI, 0],
    [1, PHI, 0],
    [-1, -PHI, 0],
    [1, -PHI, 0],
    [0, -1, PHI],
    [0, 1, PHI],
    [0, -1, -PHI],
    [0, 1, -PHI],
    [PHI, 0, -1],
    [PHI, 0, 1],
    [-PHI, 0, -1],
    [-PHI, 0, 1],
  ] as Vec3[]
).map(norm);
const ICO_F: [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

/** Point (i, j) of frequency-n face (a, b, c): the slerp-free geodesic point a + (b−a)i/n + (c−a)j/n, projected. */
const icoPoint = (a: Vec3, b: Vec3, c: Vec3, i: number, j: number, n: number): Vec3 =>
  norm(add(a, add(scl(sub(b, a), i / n), scl(sub(c, a), j / n))));

/** A geodesic sphere of frequency n: 10n² + 2 cells, each Δx model units across. */
export function icosphere(n: number, dx: number): SurfaceMesh {
  const index = new Map<string, number>();
  const pts: Vec3[] = [];
  const key = (p: Vec3): string => `${Math.round(p[0] * 1e7)},${Math.round(p[1] * 1e7)},${Math.round(p[2] * 1e7)}`;
  const vid = (p: Vec3): number => {
    const k = key(p);
    let v = index.get(k);
    if (v === undefined) {
      v = pts.length;
      pts.push(p);
      index.set(k, v);
    }
    return v;
  };
  const tris: number[] = [];
  for (const [ia, ib, ic] of ICO_F) {
    const [a, b, c] = [ICO_V[ia]!, ICO_V[ib]!, ICO_V[ic]!];
    const at = (i: number, j: number): number => vid(icoPoint(a, b, c, i, j, n));
    for (let j = 0; j < n; j += 1)
      for (let i = 0; i + j < n; i += 1) {
        tris.push(at(i, j), at(i + 1, j), at(i, j + 1));
        if (i + j + 1 < n) tris.push(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
      }
  }
  // mean edge length → model units: one edge ≈ dx
  let edgeSum = 0;
  for (let t = 0; t < tris.length; t += 3) edgeSum += len(sub(pts[tris[t]!]!, pts[tris[t + 1]!]!));
  const scale = dx / (edgeSum / (tris.length / 3));
  let adjacency: number[][] = [];
  const built = assemble("sphere", pts, tris, scale, (o, d) => {
    const b = dot(o, d);
    const c = dot(o, o) - 1;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const s = -b - Math.sqrt(disc);
    if (s < 0) return -1;
    return nearest(norm(add(o, scl(d, s))));
  });
  adjacency = built.adj;
  return built.mesh;

  // nearest cell to a unit direction: walk the neighbour graph from a coarse guess
  function nearest(p: Vec3): number {
    let best = 0;
    let bd = -Infinity;
    for (let v = 0; v < 12; v += 1) {
      const s = dot(pts[v]!, p);
      if (s > bd) {
        bd = s;
        best = v;
      }
    }
    for (;;) {
      let moved = false;
      for (const k of adjacency[best]!) {
        const s = dot(pts[k]!, p);
        if (s > bd) {
          bd = s;
          best = k;
          moved = true;
        }
      }
      if (!moved) return best;
    }
  }
}

/** Cotangent-Laplacian assembly over a closed acute triangulation of the unit-scale points. */
function assemble(
  shape: ShapeId,
  pts: Vec3[],
  tris: number[],
  scale: number,
  pick: SurfaceMesh["pick"],
): { mesh: SurfaceMesh; adj: number[][] } {
  const cells = pts.length;
  const lam = new Map<number, number>(); // edge key i*cells+k (i<k) → λ
  const ekey = (i: number, k: number): number => (i < k ? i * cells + k : k * cells + i);
  const adj: Set<number>[] = Array.from({ length: cells }, () => new Set<number>());
  const area = new Float64Array(cells);
  const P = (i: number): Vec3 => scl(pts[i]!, scale);
  for (let t = 0; t < tris.length; t += 3) {
    const v = [tris[t]!, tris[t + 1]!, tris[t + 2]!];
    for (let e = 0; e < 3; e += 1) {
      const i = v[e]!;
      const k = v[(e + 1) % 3]!;
      const o = v[(e + 2) % 3]!;
      const c = cotAt(P(o), P(i), P(k));
      lam.set(ekey(i, k), (lam.get(ekey(i, k)) ?? 0) + 0.5 * c);
      adj[i]!.add(k);
      adj[k]!.add(i);
      // Voronoi area share (acute triangles): (1/8) cot(o) |x_i − x_k|² to each end
      const l2 = dot(sub(P(i), P(k)), sub(P(i), P(k)));
      area[i] = area[i]! + (c * l2) / 8;
      area[k] = area[k]! + (c * l2) / 8;
    }
  }
  const pos = new Float32Array(cells * 4);
  const nrm = new Float32Array(cells * 4);
  const nbr = new Uint32Array(cells * 8);
  const wts = new Float32Array(cells * 8);
  for (let c = 0; c < cells; c += 1) {
    const p = pts[c]!;
    const nn = shape === "sphere" ? norm(p) : torusNormal(p);
    pos.set([p[0], p[1], p[2], 1], c * 4);
    nrm.set([nn[0], nn[1], nn[2], 0], c * 4);
    // order the neighbours counter-clockwise about the outward normal
    const t1 = norm(cross(Math.abs(nn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], nn));
    const t2 = cross(nn, t1);
    const ks = [...adj[c]!].sort((a, b) => {
      const da = sub(pts[a]!, p);
      const db = sub(pts[b]!, p);
      return Math.atan2(dot(da, t2), dot(da, t1)) - Math.atan2(dot(db, t2), dot(db, t1));
    });
    if (ks.length > MAX_NBR) throw new Error(`cell ${c} has ${ks.length} neighbours`);
    for (let q = 0; q < MAX_NBR; q += 1) {
      const k = ks[q];
      nbr[c * 8 + q] = k ?? c;
      wts[c * 8 + q] = k === undefined ? 0 : lam.get(ekey(c, k))! / area[c]!;
    }
    nbr[c * 8 + 6] = ks.length;
  }
  return { mesh: { shape, cells, pos, nrm, nbr, wts, area, scale, maxRowSum: rowSumMax(wts, cells), indices: Uint32Array.from(tris), pick }, adj: adj.map((s) => [...s]) };
}

// ------------------------------------------------------------------ torus --

/** Ring radius and tube radius of the unit-scale torus. */
export const TORUS_R = 1;
export const TORUS_r = 0.42;

function torusNormal(p: Vec3): Vec3 {
  const ring = Math.hypot(p[0], p[2]);
  return norm([p[0] - (p[0] / ring) * TORUS_R, p[1], p[2] - (p[2] / ring) * TORUS_R]);
}

/** A θ × φ torus with nφ cells round the tube (cells square where cos φ = 0). */
export function torus(nPhi: number, dx: number): SurfaceMesh {
  const nTh = Math.round((nPhi * TORUS_R) / TORUS_r / 2) * 2;
  const dTh = (2 * Math.PI) / nTh;
  const dPh = (2 * Math.PI) / nPhi;
  const scale = dx / (TORUS_r * dPh);
  const R = TORUS_R * scale;
  const r = TORUS_r * scale;
  const cells = nTh * nPhi;
  const id = (i: number, j: number): number => (((j % nPhi) + nPhi) % nPhi) * nTh + (((i % nTh) + nTh) % nTh);
  const pos = new Float32Array(cells * 4);
  const nrm = new Float32Array(cells * 4);
  const nbr = new Uint32Array(cells * 8);
  const wts = new Float32Array(cells * 8);
  const area = new Float64Array(cells);
  const indices = new Uint32Array(cells * 6);
  for (let j = 0; j < nPhi; j += 1) {
    const ph = (j + 0.5) * dPh;
    const ph0 = j * dPh;
    const ph1 = (j + 1) * dPh;
    // exact area of the θ × φ patch: r Δθ (R Δφ + r (sin φ₁ − sin φ₀))
    const A = r * dTh * (R * dPh + r * (Math.sin(ph1) - Math.sin(ph0)));
    for (let i = 0; i < nTh; i += 1) {
      const th = (i + 0.5) * dTh;
      const c = id(i, j);
      const ring = TORUS_R + TORUS_r * Math.cos(ph);
      pos.set([ring * Math.cos(th), TORUS_r * Math.sin(ph), ring * Math.sin(th), 1], c * 4);
      nrm.set([Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th), 0], c * 4);
      area[c] = A;
      // counter-clockwise about the outward normal: +φ, +θ, −φ, −θ. θ neighbours share
      // an edge r Δφ long, centres (R + r cos φ) Δθ apart; φ neighbours share
      // (R + r cos φ±½) Δθ, centres r Δφ apart.
      const wTh = (r * dPh) / ((R + r * Math.cos(ph)) * dTh * A);
      const ks = [id(i, j + 1), id(i + 1, j), id(i, j - 1), id(i - 1, j)];
      const w = [((R + r * Math.cos(ph1)) * dTh) / (r * dPh * A), wTh, ((R + r * Math.cos(ph0)) * dTh) / (r * dPh * A), wTh];
      for (let q = 0; q < MAX_NBR; q += 1) {
        nbr[c * 8 + q] = q < 4 ? ks[q]! : c;
        wts[c * 8 + q] = q < 4 ? w[q]! : 0;
      }
      nbr[c * 8 + 6] = 4;
      indices.set([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j), id(i + 1, j + 1), id(i, j + 1)], c * 6);
    }
  }
  const sdf = (p: Vec3): number => Math.hypot(Math.hypot(p[0], p[2]) - TORUS_R, p[1]) - TORUS_r;
  return {
    shape: "torus",
    cells,
    pos,
    nrm,
    nbr,
    wts,
    area,
    scale,
    maxRowSum: rowSumMax(wts, cells),
    indices,
    pick(o, d) {
      // sphere-trace the signed distance
      let s = 0;
      const far = len(o) + TORUS_R + TORUS_r + 1;
      for (let it = 0; it < 200 && s < far; it += 1) {
        const p = add(o, scl(d, s));
        const h = sdf(p);
        if (h < 1e-5) {
          const th = Math.atan2(p[2], p[0]) - dTh / 2;
          const ph = Math.atan2(p[1], Math.hypot(p[0], p[2]) - TORUS_R) - dPh / 2;
          const i = Math.round((((th / (2 * Math.PI)) % 1) + 1) % 1 * nTh);
          const j = Math.round((((ph / (2 * Math.PI)) % 1) + 1) % 1 * nPhi);
          return id(i, j);
        }
        s += h;
      }
      return -1;
    },
  };
}

function rowSumMax(wts: Float32Array, cells: number): number {
  let m = 0;
  for (let c = 0; c < cells; c += 1) {
    let s = 0;
    for (let q = 0; q < MAX_NBR; q += 1) s += wts[c * 8 + q]!;
    m = Math.max(m, s);
  }
  return m;
}

/**
 * Forward-Euler substeps per model step for diffusion stability on this mesh:
 * D·(Δt/s)·2·maxRowSum ≤ 1.9 (the flat 5-point dish runs at 4·D·Δt/Δx² per
 * row, which every model keeps under 1).
 */
export function substepsFor(m: SurfaceMesh, Dmax: number, dt: number): number {
  return Math.max(1, Math.ceil((Dmax * dt * 2 * m.maxRowSum) / 1.9));
}

/** The Laplacian of a per-cell scalar on the CPU (tests; the same sum as surface.wgsl). */
export function applyLaplacian(m: SurfaceMesh, f: Float64Array): Float64Array {
  const out = new Float64Array(m.cells);
  for (let c = 0; c < m.cells; c += 1) {
    const fc = f[c]!;
    let s = 0;
    for (let q = 0; q < MAX_NBR; q += 1) s += m.wts[c * 8 + q]! * (f[m.nbr[c * 8 + q]!]! - fc);
    out[c] = s;
  }
  return out;
}

/** Cells per shape and tier: the sphere's frequency, the torus's cells round the tube. */
export function surfaceFor(shape: ShapeId, tier: "T1" | "T2" | "T3", dx: number): SurfaceMesh {
  if (shape === "sphere") return icosphere(tier === "T3" ? 128 : tier === "T2" ? 96 : 64, dx);
  return torus(tier === "T3" ? 256 : tier === "T2" ? 192 : 128, dx);
}
