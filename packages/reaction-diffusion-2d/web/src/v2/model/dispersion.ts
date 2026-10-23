// Linear stability of a uniform steady state — the analytic side of the
// Prove drawer's Turing check (01-reaction-diffusion.md § The proof). A small
// perturbation e^{σt + i q·x} of (u*, v*) grows at the larger eigenvalue σ(q)
// of J − |q|² diag(D_u, D_v); the band where σ > 0 is Turing-unstable and its
// maximum is the fastest-growing wavenumber. The discrete scheme the GPU runs
// has its own version: the 5-point stencil turns |q|² into
// (4/Δx²)(sin²(kx/2) + sin²(ky/2)) and forward Euler turns σ into
// ln ρ(I + Δt(J − λD)) / Δt. Mirrors reaction_diffusion_2d/reference/models.py
// (same formulas, same search) — test/dispersion.test.ts checks the two
// agree against the committed prediction.

export type Jacobian = readonly [number, number, number, number];

/** Jacobian (f_u, f_v, g_u, g_v) of the Brusselator at (u*, v*) = (A, B/A). */
export function brusselatorJacobian(A: number, B: number): Jacobian {
  return [B - 1.0, A * A, -B, -A * A];
}

/** Onset B_c = (1 + A√(D_u/D_v))², critical q_c² = A/√(D_u D_v), Hopf B_H = 1 + A². */
export function brusselatorClosedForms(A: number, Du: number, Dv: number): { Bc: number; qc2: number; BH: number } {
  return { Bc: (1.0 + A * Math.sqrt(Du / Dv)) ** 2, qc2: A / Math.sqrt(Du * Dv), BH: 1.0 + A * A };
}

/** Re of the larger eigenvalue of J − Q diag(D_u, D_v), Q = |q|². */
export function growthContinuum(J: Jacobian, Du: number, Dv: number, Q: number): number {
  const [a, b, c, d] = J;
  const tr = a + d - (Du + Dv) * Q;
  const det = (a - Du * Q) * (d - Dv * Q) - b * c;
  const disc = tr * tr - 4.0 * det;
  return disc >= 0.0 ? 0.5 * (tr + Math.sqrt(disc)) : 0.5 * tr;
}

function goldenMax(fn: (x: number) => number, lo: number, hi: number, tol = 1e-12): number {
  const g = (Math.sqrt(5.0) - 1.0) / 2.0;
  let a = lo;
  let b = hi;
  let x1 = b - g * (b - a);
  let x2 = a + g * (b - a);
  let f1 = fn(x1);
  let f2 = fn(x2);
  while (b - a > tol * Math.max(1.0, Math.abs(a) + Math.abs(b))) {
    if (f1 < f2) {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + g * (b - a);
      f2 = fn(x2);
    } else {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - g * (b - a);
      f1 = fn(x1);
    }
  }
  return 0.5 * (a + b);
}

function bracket(fn: (x: number) => number, lo: number, hi: number, n: number): [number, number] {
  let best = -Infinity;
  let bi = 0;
  for (let i = 0; i <= n; i += 1) {
    const y = fn(lo + ((hi - lo) * i) / n);
    if (y > best) {
      best = y;
      bi = i;
    }
  }
  return [lo + ((hi - lo) * Math.max(bi - 1, 0)) / n, lo + ((hi - lo) * Math.min(bi + 1, n)) / n];
}

/** (Q*, σ*): the continuum relation's maximum. */
export function fastestGrowingContinuum(J: Jacobian, Du: number, Dv: number): { Q: number; sigma: number } {
  const qHi = (Math.max(Math.abs(J[0]), Math.abs(J[3])) / Math.min(Du, Dv)) * 4.0 + 1.0;
  const fn = (Q: number): number => growthContinuum(J, Du, Dv, Q);
  const [lo, hi] = bracket(fn, 0.0, qHi, 2000);
  const Q = goldenMax(fn, lo, hi);
  return { Q, sigma: fn(Q) };
}

/** Spectral radius of I + Δt(J − λ diag(D_u, D_v)) for the mode (kx, ky), radians per cell. */
export function amplification(J: Jacobian, Du: number, Dv: number, dx: number, dt: number, kx: number, ky: number): number {
  const lam = (4.0 / (dx * dx)) * (Math.sin(0.5 * kx) ** 2 + Math.sin(0.5 * ky) ** 2);
  const a = 1.0 + dt * (J[0] - Du * lam);
  const b = dt * J[1];
  const c = dt * J[2];
  const d = 1.0 + dt * (J[3] - Dv * lam);
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4.0 * det;
  return disc >= 0.0 ? 0.5 * (Math.abs(tr) + Math.sqrt(disc)) : Math.sqrt(Math.max(det, 0.0));
}

export const RING_ANGLES = 720;

/** The discrete scheme's growth rate (per unit time) averaged over the ring of r waves per n-cell window. */
export function ringGrowth(J: Jacobian, Du: number, Dv: number, dx: number, dt: number, n: number, r: number): number {
  let acc = 0.0;
  for (let j = 0; j < RING_ANGLES; j += 1) {
    const th = ((j + 0.5) / RING_ANGLES) * (Math.PI / 2.0);
    const kx = (2.0 * Math.PI * r * Math.cos(th)) / n;
    const ky = (2.0 * Math.PI * r * Math.sin(th)) / n;
    acc += Math.log(amplification(J, Du, Dv, dx, dt, kx, ky));
  }
  return acc / RING_ANGLES / dt;
}

/** (r*, σ*): the discrete scheme's fastest-growing ring, in waves per n-cell window. */
export function fastestGrowingDiscrete(J: Jacobian, Du: number, Dv: number, dx: number, dt: number, n: number): { r: number; sigma: number } {
  const fn = (r: number): number => ringGrowth(J, Du, Dv, dx, dt, n, r);
  const [lo, hi] = bracket(fn, 1.0, n / 2.0 - 1.0, 400);
  const r = goldenMax(fn, lo, hi, 1e-10);
  return { r, sigma: fn(r) };
}

/** q (radians per unit length) → waves per n-cell window of spacing dx. */
export function wavenumberToRing(q: number, dx: number, n: number): number {
  return (q * dx * n) / (2.0 * Math.PI);
}

// ------------------------------------------------------------ measurement --

/**
 * The measured growth rate of every ring between two spectra of the same
 * dish, σ(r) = ln(P(r, t₂)/P(r, t₁)) / (2Δt·steps) — the initial
 * condition's amplitude in each mode cancels in the ratio, so this is the
 * dispersion relation itself — and its peak: the maximum over r ≥ rMin,
 * refined by a least-squares quadratic over ±half rings.
 */
export function growthPeak(
  p1: ArrayLike<number>,
  p2: ArrayLike<number>,
  steps: number,
  dt: number,
  rMin: number,
  half: number,
): { r: number; sigma: Float64Array } {
  const n = Math.min(p1.length, p2.length);
  const sigma = new Float64Array(n).fill(-Infinity);
  let bi = -1;
  for (let r = rMin; r < n; r += 1) {
    const s = Math.log(p2[r]! / p1[r]!) / (2.0 * steps * dt);
    sigma[r] = Number.isFinite(s) ? s : -Infinity;
    if (bi < 0 || sigma[r]! > sigma[bi]!) bi = r;
  }
  if (bi < 0) return { r: NaN, sigma };
  const lo = Math.max(bi - half, rMin);
  const hi = Math.min(bi + half + 1, n);
  // least squares y ≈ c0 + c1 x + c2 x², x = r − bi
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let t0 = 0;
  let t1 = 0;
  let t2 = 0;
  for (let r = lo; r < hi; r += 1) {
    const x = r - bi;
    const y = sigma[r]!;
    s0 += 1;
    s1 += x;
    s2 += x * x;
    s3 += x * x * x;
    s4 += x * x * x * x;
    t0 += y;
    t1 += x * y;
    t2 += x * x * y;
  }
  const det3 = (m: number[]): number =>
    m[0]! * (m[4]! * m[8]! - m[5]! * m[7]!) - m[1]! * (m[3]! * m[8]! - m[5]! * m[6]!) + m[2]! * (m[3]! * m[7]! - m[4]! * m[6]!);
  const A = [s0, s1, s2, s1, s2, s3, s2, s3, s4];
  const D = det3(A);
  const c1 = det3([s0, t0, s2, s1, t1, s3, s2, t2, s4]) / D;
  const c2 = det3([s0, s1, t0, s1, s2, t1, s2, s3, t2]) / D;
  const r = c2 < 0 ? bi - c1 / (2 * c2) : bi;
  return { r, sigma };
}
