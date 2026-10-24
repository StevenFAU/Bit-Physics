// The hidden-channel tint (docs/planning/rebuild-v2/04-neural-ca.md § The look):
// principal components of the 12 hidden channels over the living cells,
// projected to three colours. Display only — computed on the CPU from a
// readback of the live state, never fed back into the simulation.

export const HIDDEN0 = 4;
export const HIDDEN = 12;

export interface HiddenBasis {
  /** Mean of each hidden channel over the living cells. */
  mean: Float32Array;
  /** Three principal axes, row-major 3 × 12 (unit length; largest loading positive). */
  axes: Float32Array;
  /** Standard deviation of the projection on each axis (for normalising). */
  scale: Float32Array;
  /** Share of the hidden variance each axis carries. */
  explained: [number, number, number];
  /** Living cells the basis was measured on. */
  cells: number;
}

/** Eigen-decomposition of a symmetric n × n matrix (cyclic Jacobi). Returns values and column eigenvectors. */
export function jacobiEigen(a0: ArrayLike<number>, n: number, sweeps = 64): { values: Float64Array; vectors: Float64Array } {
  const a = Float64Array.from(a0);
  const v = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) v[i * n + i] = 1;
  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    let off = 0;
    for (let p = 0; p < n; p += 1) for (let q = p + 1; q < n; q += 1) off += a[p * n + q]! ** 2;
    if (off < 1e-22) break;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = a[p * n + q]!;
        if (Math.abs(apq) < 1e-300) continue;
        const app = a[p * n + p]!;
        const aqq = a[q * n + q]!;
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = a[k * n + p]!;
          const akq = a[k * n + q]!;
          a[k * n + p] = c * akp - s * akq;
          a[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p * n + k]!;
          const aqk = a[q * n + k]!;
          a[p * n + k] = c * apk - s * aqk;
          a[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = v[k * n + p]!;
          const vkq = v[k * n + q]!;
          v[k * n + p] = c * vkp - s * vkq;
          v[k * n + q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const values = new Float64Array(n);
  for (let i = 0; i < n; i += 1) values[i] = a[i * n + i]!;
  return { values, vectors: v };
}

/**
 * PCA of the hidden channels over cells with alpha > `alive` (the kernel's
 * threshold). `state` is cell-major with `cn` channels per cell. Null when
 * fewer than 16 cells are alive.
 */
export function hiddenBasis(state: ArrayLike<number>, cells: number, cn = 16, alive = 0.1): HiddenBasis | null {
  const mean = new Float64Array(HIDDEN);
  let n = 0;
  for (let c = 0; c < cells; c += 1) {
    if (!(state[c * cn + 3]! > alive)) continue;
    n += 1;
    for (let k = 0; k < HIDDEN; k += 1) mean[k]! += state[c * cn + HIDDEN0 + k]!;
  }
  if (n < 16) return null;
  for (let k = 0; k < HIDDEN; k += 1) mean[k]! /= n;
  const cov = new Float64Array(HIDDEN * HIDDEN);
  const d = new Float64Array(HIDDEN);
  for (let c = 0; c < cells; c += 1) {
    if (!(state[c * cn + 3]! > alive)) continue;
    for (let k = 0; k < HIDDEN; k += 1) d[k] = state[c * cn + HIDDEN0 + k]! - mean[k]!;
    for (let i = 0; i < HIDDEN; i += 1) for (let j = i; j < HIDDEN; j += 1) cov[i * HIDDEN + j]! += d[i]! * d[j]!;
  }
  for (let i = 0; i < HIDDEN; i += 1) {
    for (let j = i; j < HIDDEN; j += 1) {
      cov[i * HIDDEN + j]! /= n;
      cov[j * HIDDEN + i] = cov[i * HIDDEN + j]!;
    }
  }
  const { values, vectors } = jacobiEigen(cov, HIDDEN);
  const order = Array.from({ length: HIDDEN }, (_, i) => i).sort((a, b) => values[b]! - values[a]!);
  const total = values.reduce((s, x) => s + Math.max(0, x), 0) || 1;
  const axes = new Float32Array(3 * HIDDEN);
  const scale = new Float32Array(3);
  const explained: [number, number, number] = [0, 0, 0];
  for (let r = 0; r < 3; r += 1) {
    const col = order[r]!;
    let big = 0;
    for (let k = 0; k < HIDDEN; k += 1) if (Math.abs(vectors[k * HIDDEN + col]!) > Math.abs(big)) big = vectors[k * HIDDEN + col]!;
    const sign = big < 0 ? -1 : 1;
    for (let k = 0; k < HIDDEN; k += 1) axes[r * HIDDEN + k] = sign * vectors[k * HIDDEN + col]!;
    const lam = Math.max(values[col]!, 0);
    scale[r] = Math.sqrt(lam) || 1;
    explained[r] = lam / total;
  }
  return { mean: Float32Array.from(mean), axes, scale, explained, cells: n };
}
