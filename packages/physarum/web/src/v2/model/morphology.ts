// Morphology of a trail field (02-physarum.md § The proof, "morphology
// checks"): what shape the network is, as numbers, so a personality can be
// calibrated and a scene regression-tested instead of eyeballed.
//
// The trail (in units of its mean at balance) is thresholded into tube cells
// on the periodic dish, then:
//   * tubes  — 8-connected components of tube cells (pieces of network);
//   * meshes — 4-connected components of the rest (the gaps the tubes enclose;
//              a single gap spanning the dish is no mesh);
//   * cover  — the fraction of the dish that is tube;
//   * length — tube boundary / 2, a tube-length estimate (cells);
//   * width  — tube area / length.
// A polygon network has many meshes per piece; marching rods have many
// pieces and one gap; a dense sheet has high cover and few, small meshes.

export interface Morph {
  /** Fraction of the dish above the threshold. */
  cover: number;
  /** Network pieces (8-connected tube components of at least `minCells`). */
  pieces: number;
  /** Enclosed gaps (4-connected non-tube components of at least `minCells`, excluding one spanning the dish). */
  meshes: number;
  /** Tube length estimate, cells per 1,000 cells of dish. */
  lengthDensity: number;
  /** Mean tube width, cells. */
  width: number;
  /** Mean enclosed gap area, cells (0 without meshes). */
  meshArea: number;
  /** meshes / (meshes + pieces): 1 = all loops, 0 = no loops. */
  loopiness: number;
  /** Pieces and meshes per 100,000 cells of dish. */
  pieceDensity: number;
  meshDensity: number;
}

class UnionFind {
  readonly parent: Int32Array;
  constructor(n: number) {
    this.parent = new Int32Array(n);
    for (let i = 0; i < n; i += 1) this.parent[i] = i;
  }
  find(i: number): number {
    const p = this.parent;
    while (p[i] !== i) {
      p[i] = p[p[i]!]!;
      i = p[i]!;
    }
    return i;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra < rb ? rb : ra] = ra < rb ? ra : rb;
  }
}

/**
 * Block-average a w × h field by `step` (w, h multiples of step not required:
 * the last partial block averages what it has).
 */
export function downsample(f: Float32Array, w: number, h: number, step: number): { field: Float32Array; w: number; h: number } {
  if (step <= 1) return { field: f, w, h };
  const ow = Math.ceil(w / step);
  const oh = Math.ceil(h / step);
  const out = new Float32Array(ow * oh);
  const cnt = new Float32Array(ow * oh);
  for (let y = 0; y < h; y += 1) {
    const oy = ((y / step) | 0) * ow;
    for (let x = 0; x < w; x += 1) {
      const o = oy + ((x / step) | 0);
      out[o]! += f[y * w + x]!;
      cnt[o]! += 1;
    }
  }
  for (let i = 0; i < out.length; i += 1) out[i]! /= cnt[i]!;
  return { field: out, w: ow, h: oh };
}

/** Label components of `mask` (1 = member) on a periodic w × h grid; returns sizes per root. */
function components(mask: Uint8Array, w: number, h: number, eight: boolean): Map<number, number> {
  const uf = new UnionFind(w * h);
  for (let y = 0; y < h; y += 1) {
    const yd = y + 1 === h ? 0 : y + 1;
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const xr = x + 1 === w ? 0 : x + 1;
      const xl = x === 0 ? w - 1 : x - 1;
      if (mask[y * w + xr]) uf.union(i, y * w + xr);
      if (mask[yd * w + x]) uf.union(i, yd * w + x);
      if (eight) {
        if (mask[yd * w + xr]) uf.union(i, yd * w + xr);
        if (mask[yd * w + xl]) uf.union(i, yd * w + xl);
      }
    }
  }
  const sizes = new Map<number, number>();
  for (let i = 0; i < w * h; i += 1) {
    if (!mask[i]) continue;
    const r = uf.find(i);
    sizes.set(r, (sizes.get(r) ?? 0) + 1);
  }
  return sizes;
}

/**
 * Morphology of `field` (already ÷ its mean at balance) on a periodic
 * w × h dish, thresholded at `threshold` × the mean.
 */
export function morphology(field: Float32Array, w: number, h: number, threshold = 1, minCells = 6): Morph {
  const n = w * h;
  const tube = new Uint8Array(n);
  const gap = new Uint8Array(n);
  let area = 0;
  for (let i = 0; i < n; i += 1) {
    if (field[i]! > threshold) {
      tube[i] = 1;
      area += 1;
    } else gap[i] = 1;
  }
  // boundary: tube/gap transitions along x and y (periodic)
  let edges = 0;
  for (let y = 0; y < h; y += 1) {
    const yd = y + 1 === h ? 0 : y + 1;
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const xr = x + 1 === w ? 0 : x + 1;
      if (tube[i] !== tube[y * w + xr]) edges += 1;
      if (tube[i] !== tube[yd * w + x]) edges += 1;
    }
  }
  const pieceSizes = [...components(tube, w, h, true).values()].filter((s) => s >= minCells);
  const gapSizes = [...components(gap, w, h, false).values()].filter((s) => s >= minCells).sort((a, b) => b - a);
  // a gap that holds most of the empty dish is the background, not a mesh
  const empty = n - area;
  const enclosed = gapSizes.length > 0 && gapSizes[0]! > 0.5 * empty ? gapSizes.slice(1) : gapSizes;
  const length = edges / 2;
  const pieces = pieceSizes.length;
  const meshes = enclosed.length;
  return {
    cover: area / n,
    pieces,
    meshes,
    lengthDensity: (length / n) * 1000,
    width: length > 0 ? area / length : 0,
    meshArea: meshes > 0 ? enclosed.reduce((a, b) => a + b, 0) / meshes : 0,
    loopiness: meshes + pieces > 0 ? meshes / (meshes + pieces) : 0,
    pieceDensity: (pieces / n) * 1e5,
    meshDensity: (meshes / n) * 1e5,
  };
}
