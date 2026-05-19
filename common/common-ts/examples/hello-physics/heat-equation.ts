// 2D heat-equation evolution with a Gaussian initial condition.
//
// The analytical solution to the 2D heat equation
//
//     u_t = D (u_xx + u_yy)
//
// for a Gaussian IC `u(x, y, 0) = exp(-(x^2 + y^2) / (2 sigma_0^2))` on
// an unbounded domain is a wider Gaussian:
//
//     u(x, y, t) = sigma_0^2 / sigma(t)^2 * exp(-(x^2 + y^2) / (2 sigma(t)^2))
//
// where `sigma(t)^2 = sigma_0^2 + 2 D t`. The smoke sim runs a finite-
// difference FTCS scheme on a periodic NxN grid; for sigma small
// compared to L = 1 the periodic image is negligible and the discrete
// solution stays close to the analytical one.

export interface HeatSimParams {
  n: number;
  /** Diffusion coefficient. */
  D: number;
  /** Grid step (units of length). */
  dx: number;
  /** Time step. */
  dt: number;
  /** Initial Gaussian standard deviation. */
  sigma0: number;
  /** Sentinel seed; unused by the deterministic FD evolver but recorded. */
  seed: number;
}

export const DEFAULT_PARAMS: HeatSimParams = {
  n: 32,
  D: 1.0,
  dx: 1.0 / 32,
  dt: 0.0001,
  sigma0: 0.05,
  seed: 42,
};

/** Build an N x N Gaussian initial condition centered on the grid. */
export function gaussianIC(p: HeatSimParams): Float64Array {
  const u = new Float64Array(p.n * p.n);
  const cx = (p.n - 1) / 2;
  const cy = (p.n - 1) / 2;
  const inv2s2 = 1.0 / (2.0 * p.sigma0 * p.sigma0);
  for (let j = 0; j < p.n; j += 1) {
    for (let i = 0; i < p.n; i += 1) {
      const x = (i - cx) * p.dx;
      const y = (j - cy) * p.dx;
      u[j * p.n + i] = Math.exp(-(x * x + y * y) * inv2s2);
    }
  }
  return u;
}

/** One FTCS step with periodic BCs. Returns the new array. */
export function ftcsStep(u: Float64Array, p: HeatSimParams): Float64Array {
  const { n, D, dx, dt } = p;
  const out = new Float64Array(u.length);
  const c = (D * dt) / (dx * dx);
  for (let j = 0; j < n; j += 1) {
    const jm1 = (j - 1 + n) % n;
    const jp1 = (j + 1) % n;
    for (let i = 0; i < n; i += 1) {
      const im1 = (i - 1 + n) % n;
      const ip1 = (i + 1) % n;
      const center = u[j * n + i] ?? 0;
      const left = u[j * n + im1] ?? 0;
      const right = u[j * n + ip1] ?? 0;
      const down = u[jm1 * n + i] ?? 0;
      const up = u[jp1 * n + i] ?? 0;
      out[j * n + i] = center + c * (left + right + down + up - 4 * center);
    }
  }
  return out;
}

/** Analytical Gaussian solution at time `t` on the same grid. */
export function gaussianAtTime(t: number, p: HeatSimParams): Float64Array {
  const sigma2 = p.sigma0 * p.sigma0 + 2 * p.D * t;
  const amp = (p.sigma0 * p.sigma0) / sigma2;
  const inv2s2 = 1.0 / (2.0 * sigma2);
  const out = new Float64Array(p.n * p.n);
  const cx = (p.n - 1) / 2;
  const cy = (p.n - 1) / 2;
  for (let j = 0; j < p.n; j += 1) {
    for (let i = 0; i < p.n; i += 1) {
      const x = (i - cx) * p.dx;
      const y = (j - cy) * p.dx;
      out[j * p.n + i] = amp * Math.exp(-(x * x + y * y) * inv2s2);
    }
  }
  return out;
}

export interface HeatSimResult {
  finalState: Float64Array;
  states: Float64Array[];
  diagnostics: { mass: number; max: number };
}

/**
 * Run the FTCS scheme for `steps` ticks, returning every step's array
 * (so the caller can feed each into a CaptureWriter).
 */
export function runHeatSim(p: HeatSimParams, steps: number): HeatSimResult {
  let u = gaussianIC(p);
  const states: Float64Array[] = [u.slice()];
  for (let s = 0; s < steps; s += 1) {
    u = ftcsStep(u, p);
    states.push(u.slice());
  }
  let mass = 0;
  let max = -Infinity;
  for (const v of u) {
    mass += v;
    if (v > max) max = v;
  }
  return { finalState: u, states, diagnostics: { mass, max } };
}
