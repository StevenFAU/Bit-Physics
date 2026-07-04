// mirror.ts — in-page IEEE-f64 reference mirror.
//
// JavaScript numbers ARE IEEE-754 f64, so a textual port of the closed-form
// reference expressions reproduces the Python reference to <= 1 ulp (exactly,
// for pure +,-,*,/ chains; Math.log may differ from libm by <= 1 ulp, hence
// the fixture tolerance instead of bit-equality on log-dependent outputs).
//
// Mirrors:
// - the quadratic B-spline N(x) + partition-of-unity sum
//   (packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py)
// - the neo-Hookean Kirchhoff stress incl. the log_j = -30 guard
//   (packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py
//   compute_particle_stresses)
// - an f64 3x3 singular-value solver (Jacobi on F^T F) used to INDEPENDENTLY
//   verify the GPU's snow return-map output bounds (the page does not trust
//   the shader's own sigma report).

/** Quadratic B-spline N(x) — verbatim piecewise closed form. */
export function bsplineN(x: number): number {
  const ax = Math.abs(x);
  if (ax < 0.5) return 0.75 - x * x;
  if (ax < 1.5) return 0.5 * (1.5 - ax) * (1.5 - ax);
  return 0.0;
}

/** Partition-of-unity sum with base = floor(p + 0.5) - 1. */
export function pouSum(p: number): number {
  const base = Math.floor(p + 0.5) - 1;
  let s = 0;
  for (let k = 0; k < 3; k += 1) s += bsplineN(p - (base + k));
  return s;
}

/**
 * Neo-Hookean Kirchhoff stress (row-major 9-vector in, 9-vector out) —
 * textual port of compute_particle_stresses, same operation order,
 * including the log_j = -30 guard when J <= 0.
 */
export function neoHookeanStress(
  f: readonly number[],
  mu: number,
  lam: number,
): number[] {
  const [f00, f01, f02, f10, f11, f12, f20, f21, f22] = f as [
    number, number, number, number, number, number, number, number, number,
  ];
  const jDet =
    f00 * (f11 * f22 - f12 * f21) -
    f01 * (f10 * f22 - f12 * f20) +
    f02 * (f10 * f21 - f11 * f20);
  const ff00 = f00 * f00 + f01 * f01 + f02 * f02;
  const ff01 = f00 * f10 + f01 * f11 + f02 * f12;
  const ff02 = f00 * f20 + f01 * f21 + f02 * f22;
  const ff11 = f10 * f10 + f11 * f11 + f12 * f12;
  const ff12 = f10 * f20 + f11 * f21 + f12 * f22;
  const ff22 = f20 * f20 + f21 * f21 + f22 * f22;
  const logJ = jDet <= 0.0 ? -30.0 : Math.log(jDet);
  const sIso = lam * logJ;
  return [
    mu * (ff00 - 1.0) + sIso,
    mu * ff01,
    mu * ff02,
    mu * ff01,
    mu * (ff11 - 1.0) + sIso,
    mu * ff12,
    mu * ff02,
    mu * ff12,
    mu * (ff22 - 1.0) + sIso,
  ];
}

/** det of a row-major 3x3. */
export function det3(f: readonly number[]): number {
  return (
    f[0] * (f[4] * f[8] - f[5] * f[7]) -
    f[1] * (f[3] * f[8] - f[5] * f[6]) +
    f[2] * (f[3] * f[7] - f[4] * f[6])
  );
}

/**
 * Singular values of a row-major 3x3 (descending), via cyclic Jacobi
 * eigen-decomposition of A = F^T F in f64 (30 sweeps — overkill; converges
 * to machine precision in ~6).
 */
export function singularValues3(f: readonly number[]): [number, number, number] {
  // A = F^T F (symmetric, PSD).
  const a = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      let s = 0;
      for (let k = 0; k < 3; k += 1) s += f[k * 3 + i] * f[k * 3 + j];
      a[i][j] = s;
    }
  }
  for (let sweep = 0; sweep < 30; sweep += 1) {
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const apq = a[p][q];
      if (Math.abs(apq) < 1e-300) continue;
      const tau = (a[q][q] - a[p][p]) / (2 * apq);
      const t =
        tau >= 0
          ? 1 / (tau + Math.sqrt(1 + tau * tau))
          : -1 / (-tau + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t);
      const s = t * c;
      for (let k = 0; k < 3; k += 1) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k += 1) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
    }
  }
  const eig = [Math.max(a[0][0], 0), Math.max(a[1][1], 0), Math.max(a[2][2], 0)];
  eig.sort((x, y) => y - x);
  return [Math.sqrt(eig[0]), Math.sqrt(eig[1]), Math.sqrt(eig[2])];
}

/** ||F^T F - I||_max — orthogonality deviation (sand Case II witness). */
export function orthoDeviation(f: readonly number[]): number {
  let worst = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      let s = 0;
      for (let k = 0; k < 3; k += 1) s += f[k * 3 + i] * f[k * 3 + j];
      worst = Math.max(worst, Math.abs(s - (i === j ? 1 : 0)));
    }
  }
  return worst;
}

/** Deterministic 32-bit RNG (mulberry32) for fixture/scene seeding. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** SHA-256 hex of a typed array's bytes (run-twice proof display). */
export async function sha256hex(
  data: Float32Array | Int32Array | Uint8Array,
): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
