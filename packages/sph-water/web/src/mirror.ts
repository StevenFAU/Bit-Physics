// In-page IEEE-f64 mirror of the Phase-1 reference
// (packages/sph-water/sph_water/reference/dfsph.py).
//
// JavaScript numbers ARE IEEE-754 f64, and the reference uses only
// +, -, *, /, sqrt (all correctly rounded) plus polynomial kernel
// factors — no transcendentals — so a mirror that reproduces the
// reference's exact operation ORDER is bit-comparable to NumPy f64.
// Two deliberate pins keep it that way:
//   1. kernel coefficients sigma/h^3 and sigma/h^4 are consumed from
//      the committed fixtures (computed by CPython/glibc pow) instead
//      of calling Math.pow — V8's pow is not guaranteed to round h**4
//      identically to glibc's;
//   2. neighbor iteration is sorted-ascending-by-id with self excluded
//      and a strict r^2 < (2h)^2 support test — the reference's
//      neighbor_lists contract (P24 cause #1/#2 discipline).
//
// The mirror's claim is checked, not assumed: verify-panel.ts compares
// every mirror output bit-for-bit (Object.is) against the committed
// reference-computed fixtures in
// packages/sph-water/web/fixtures/reference-fixtures.json.

export interface MirrorCoeffs {
  sigma_h3: number; // sigma_3 / h^3 (CPython-computed)
  sigma_h4: number; // sigma_3 / h^4 (CPython-computed)
}

// Cubic-spline piecewise factor f(q) — ports _f (support 2h).
export function kernelF(q: number): number {
  if (q < 1.0) return 1.0 - 1.5 * q * q + 0.75 * q * q * q;
  if (q < 2.0) {
    const d = 2.0 - q;
    return 0.25 * d * d * d;
  }
  return 0.0;
}

// f'(q) — ports _fprime.
export function kernelFprime(q: number): number {
  if (q < 1.0) return -3.0 * q + 2.25 * q * q;
  if (q < 2.0) {
    const d = 2.0 - q;
    return -0.75 * d * d;
  }
  return 0.0;
}

export function kernelW(q: number, c: MirrorCoeffs): number {
  return c.sigma_h3 * kernelF(q);
}

export function kernelGradWMag(q: number, c: MirrorCoeffs): number {
  return c.sigma_h4 * Math.abs(kernelFprime(q));
}

function norm3(x: number, y: number, z: number): number {
  // np.linalg.norm on a 3-vector: sqrt(ddot) — sequential left-to-right.
  return Math.sqrt(x * x + y * y + z * z);
}

// Sorted-ascending neighbor lists, self excluded, strict < 2h — ports
// neighbor_lists (O(n^2) diagnostic tier; fixture scale only).
function neighborLists(pos: Float64Array, n: number, h: number): number[][] {
  const cutoffSq = 2.0 * h * (2.0 * h);
  const lists: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const nl: number[] = [];
    for (let j = 0; j < n; j += 1) {
      if (j === i) continue;
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < cutoffSq) nl.push(j);
    }
    lists.push(nl);
  }
  return lists;
}

// rho_i = sum_j m_j W — ports density(): self term first, then sorted
// neighbors; per-term accumulation order preserved.
export function mirrorDensity(
  pos: Float64Array,
  masses: Float64Array,
  n: number,
  h: number,
  c: MirrorCoeffs,
): Float64Array {
  const lists = neighborLists(pos, n, h);
  const rho = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    let accum = masses[i] * (c.sigma_h3 * kernelF(0.0));
    for (const j of lists[i]) {
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      const q = norm3(dx, dy, dz) / h;
      accum += masses[j] * (c.sigma_h3 * kernelF(q));
    }
    rho[i] = accum;
  }
  return rho;
}

// drho_i/dt = sum_j m_j (v_i - v_j) . grad_i W — ports density_evolution()
// per-pair op order: mag -> q -> r/mag (3 divisions) -> coeff*r_hat ->
// dot(v_rel, grad) -> m_j * dot.
export function mirrorContinuity(
  pos: Float64Array,
  vel: Float64Array,
  masses: Float64Array,
  n: number,
  h: number,
  c: MirrorCoeffs,
): Float64Array {
  const lists = neighborLists(pos, n, h);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    let accum = 0.0;
    for (const j of lists[i]) {
      const rx = pos[i * 3] - pos[j * 3];
      const ry = pos[i * 3 + 1] - pos[j * 3 + 1];
      const rz = pos[i * 3 + 2] - pos[j * 3 + 2];
      const mag = norm3(rx, ry, rz);
      if (mag === 0.0) continue;
      const q = mag / h;
      const coeff = c.sigma_h4 * kernelFprime(q);
      const gx = coeff * (rx / mag);
      const gy = coeff * (ry / mag);
      const gz = coeff * (rz / mag);
      const vx = vel[i * 3] - vel[j * 3];
      const vy = vel[i * 3 + 1] - vel[j * 3 + 1];
      const vz = vel[i * 3 + 2] - vel[j * 3 + 2];
      accum += masses[j] * (vx * gx + vy * gy + vz * gz);
    }
    out[i] = accum;
  }
  return out;
}

// Ports divergence_free_solve(): fixed cap, <= tolerance break, symmetric
// 0.5*(drho_i - drho_j) pair correction in the reference's exact
// sequential pair order (i ascending, j > i ascending within support).
export function mirrorCorrector(
  pos: Float64Array,
  vel0: Float64Array,
  masses: Float64Array,
  n: number,
  h: number,
  maxIter: number,
  tolerance: number,
  rho0: number,
  c: MirrorCoeffs,
): { vel: Float64Array; iterations: number } {
  const vel = vel0.slice();
  const cutoffSq = 2.0 * h * (2.0 * h);
  let iterations = 0;
  for (let it = 0; it < maxIter; it += 1) {
    const drho = mirrorContinuity(pos, vel, masses, n, h, c);
    let maxAbs = 0.0;
    for (let i = 0; i < n; i += 1) maxAbs = Math.max(maxAbs, Math.abs(drho[i]));
    if (maxAbs <= tolerance) break;
    iterations = it + 1;
    const dv = new Float64Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const rx = pos[i * 3] - pos[j * 3];
        const ry = pos[i * 3 + 1] - pos[j * 3 + 1];
        const rz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d2 = rx * rx + ry * ry + rz * rz;
        if (d2 >= cutoffSq) continue;
        const mag = Math.sqrt(d2);
        if (mag === 0.0) continue;
        const q = mag / h;
        const coeff = c.sigma_h4 * kernelFprime(q);
        const gx = coeff * (rx / mag);
        const gy = coeff * (ry / mag);
        const gz = coeff * (rz / mag);
        const corr = 0.5 * (drho[i] - drho[j]);
        const mi = masses[i] / rho0;
        const mj = masses[j] / rho0;
        dv[i * 3] -= corr * gx * mj;
        dv[i * 3 + 1] -= corr * gy * mj;
        dv[i * 3 + 2] -= corr * gz * mj;
        dv[j * 3] += corr * gx * mi;
        dv[j * 3 + 1] += corr * gy * mi;
        dv[j * 3 + 2] += corr * gz * mi;
      }
    }
    for (let k = 0; k < n * 3; k += 1) vel[k] = vel[k] + dv[k];
  }
  return { vel, iterations };
}

// The canonical integrator in f64 — ports sim.py _canonical_step's
// integration exactly (v.z += g_z*dt; p += dt*v). Used by the PROVE
// panel to produce the exact f64 trajectory offsets for display.
export function mirrorCanonicalOffsets(
  gz: number,
  dt: number,
  steps: number,
): { dz: number; vz: number } {
  let vz = 0.0;
  let dz = 0.0;
  for (let s = 0; s < steps; s += 1) {
    vz = vz + gz * dt;
    dz = dz + dt * vz;
  }
  return { dz, vz };
}

export interface MirrorCheckResult {
  label: string;
  bitExact: boolean;
  maxAbsDiff: number;
  n: number;
}

export function compareBitExact(
  label: string,
  got: Float64Array | number[],
  want: Float64Array | number[],
): MirrorCheckResult {
  const n = Math.min(got.length, want.length);
  let bit = got.length === want.length;
  let maxAbs = 0.0;
  for (let i = 0; i < n; i += 1) {
    const g = typeof got[i] === "number" ? (got[i] as number) : Number(got[i]);
    const w = typeof want[i] === "number" ? (want[i] as number) : Number(want[i]);
    if (!Object.is(g, w)) bit = false;
    maxAbs = Math.max(maxAbs, Math.abs(g - w));
  }
  return { label, bitExact: bit, maxAbsDiff: maxAbs, n };
}
