// The Lorenz system in f64 on the CPU (05-strange-attractors.md, "The
// model"): the reference trajectory an ensemble is released around, the RK4
// stage points the GPU deviation kernel consumes, the attractor sample the
// Release tool picks on, the fixed points, and the stretching direction that
// colours a released ball.
//
// The ensemble is integrated as offsets δ from this f64 reference. Lorenz is
// quadratic, so f(s + δ) − f(s) = J(s)·δ + Q(δ) exactly; RK4 on δ with the
// reference's own stage points is algebraically the same RK4 as on s + δ.
// The offsets keep f32's relative precision however small they are, so a
// ball 10⁻¹² wide is resolved — where absolute f32 coordinates near |x| ≈ 20
// are spaced ~2·10⁻⁶ apart and would collapse it to a handful of points.

export type V3 = [number, number, number];

export interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
}

/** σ = 10, ρ = 28, β = 8/3 — Lorenz 1963, the gated capture's regime. */
export const CLASSIC: Readonly<LorenzParams> = { sigma: 10, rho: 28, beta: 8 / 3 };

/** The gated integrator's step (verify.py, the committed capture manifest). */
export const DT = 0.01;

export function field(p: LorenzParams, s: V3): V3 {
  return [p.sigma * (s[1] - s[0]), s[0] * (p.rho - s[2]) - s[1], s[0] * s[1] - p.beta * s[2]];
}

/** f(s + e) − f(s), written so no large terms cancel (exact for a quadratic field). */
export function deviation(p: LorenzParams, s: V3, e: V3): V3 {
  return [
    p.sigma * (e[1] - e[0]),
    e[0] * (p.rho - s[2]) - s[0] * e[2] - e[1] - e[0] * e[2],
    s[0] * e[1] + s[1] * e[0] + e[0] * e[1] - p.beta * e[2],
  ];
}

const axpy = (a: number, x: V3, y: V3): V3 => [y[0] + a * x[0], y[1] + a * x[1], y[2] + a * x[2]];

/** The four RK4 stage points of one step from x. */
export type Stages = [V3, V3, V3, V3];

/** One classical RK4 step; also returns the stage points it evaluated f at. */
export function rk4Step(p: LorenzParams, x: V3, dt: number): { next: V3; stages: Stages } {
  const s1 = x;
  const k1 = field(p, s1);
  const s2 = axpy(0.5 * dt, k1, x);
  const k2 = field(p, s2);
  const s3 = axpy(0.5 * dt, k2, x);
  const k3 = field(p, s3);
  const s4 = axpy(dt, k3, x);
  const k4 = field(p, s4);
  const next: V3 = [
    x[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    x[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    x[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
  return { next, stages: [s1, s2, s3, s4] };
}

/** One RK4 step of an offset e around a reference step with stage points `st` (the GPU kernel, in f64). */
export function deviationStep(p: LorenzParams, st: Stages, e: V3, dt: number): V3 {
  const d1 = deviation(p, st[0], e);
  const d2 = deviation(p, st[1], axpy(0.5 * dt, d1, e));
  const d3 = deviation(p, st[2], axpy(0.5 * dt, d2, e));
  const d4 = deviation(p, st[3], axpy(dt, d3, e));
  return [
    e[0] + (dt / 6) * (d1[0] + 2 * d2[0] + 2 * d3[0] + d4[0]),
    e[1] + (dt / 6) * (d1[1] + 2 * d2[1] + 2 * d3[1] + d4[1]),
    e[2] + (dt / 6) * (d1[2] + 2 * d2[2] + 2 * d3[2] + d4[2]),
  ];
}

/** The fixed points: the origin, and C± = (±√(β(ρ−1)), ±√(β(ρ−1)), ρ−1) when ρ > 1. */
export function fixedPoints(p: LorenzParams): V3[] {
  const out: V3[] = [[0, 0, 0]];
  if (p.rho > 1) {
    const a = Math.sqrt(p.beta * (p.rho - 1));
    out.push([a, a, p.rho - 1], [-a, -a, p.rho - 1]);
  }
  return out;
}

/** The f64 reference an ensemble is released around (the ball's centre). */
export class Reference {
  x: V3;
  steps = 0;
  constructor(x0: V3) {
    this.x = [...x0];
  }
  /** Advance one step; returns the stage points the GPU needs for it. */
  step(p: LorenzParams, dt: number): Stages {
    const r = rk4Step(p, this.x, dt);
    this.x = r.next;
    this.steps += 1;
    return r.stages;
  }
}

/**
 * Points on the attractor: a trajectory from x0, its transient discarded,
 * sampled every `every` steps. Packed xyz in f64.
 */
export function sampleAttractor(p: LorenzParams, n: number, every = 2, warm = 2000, x0: V3 = [1, 1, 1], dt = DT): Float64Array<ArrayBuffer> {
  let x = x0;
  for (let i = 0; i < warm; i += 1) x = rk4Step(p, x, dt).next;
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < every; k += 1) x = rk4Step(p, x, dt).next;
    out[i * 3] = x[0];
    out[i * 3 + 1] = x[1];
    out[i * 3 + 2] = x[2];
  }
  return out;
}

/**
 * The initial direction a small ball is stretched along most over `T` time
 * units from x0: the top right-singular vector of the flow map's Jacobian,
 * by power iteration on JᵀJ (tangent vectors integrated by the same RK4).
 */
export function stretchDirection(p: LorenzParams, x0: V3, T = 1.5, dt = DT): V3 {
  const n = Math.max(1, Math.round(T / dt));
  // the flow map's Jacobian: integrate the three unit tangent vectors (columns)
  let x = x0;
  const cols: V3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let i = 0; i < n; i += 1) {
    const { next, stages } = rk4Step(p, x, dt);
    for (let c = 0; c < 3; c += 1) {
      // the variational equation is linear: integrate it with the same stages
      const lin = (s: V3, e: V3): V3 => [
        p.sigma * (e[1] - e[0]),
        e[0] * (p.rho - s[2]) - s[0] * e[2] - e[1],
        s[0] * e[1] + s[1] * e[0] - p.beta * e[2],
      ];
      const e = cols[c]!;
      const d1 = lin(stages[0], e);
      const d2 = lin(stages[1], axpy(0.5 * dt, d1, e));
      const d3 = lin(stages[2], axpy(0.5 * dt, d2, e));
      const d4 = lin(stages[3], axpy(dt, d3, e));
      cols[c] = [
        e[0] + (dt / 6) * (d1[0] + 2 * d2[0] + 2 * d3[0] + d4[0]),
        e[1] + (dt / 6) * (d1[1] + 2 * d2[1] + 2 * d3[1] + d4[1]),
        e[2] + (dt / 6) * (d1[2] + 2 * d2[2] + 2 * d3[2] + d4[2]),
      ];
    }
    x = next;
  }
  // J = [cols]; power iteration on JᵀJ
  const J = (v: V3): V3 => [
    cols[0]![0] * v[0] + cols[1]![0] * v[1] + cols[2]![0] * v[2],
    cols[0]![1] * v[0] + cols[1]![1] * v[1] + cols[2]![1] * v[2],
    cols[0]![2] * v[0] + cols[1]![2] * v[1] + cols[2]![2] * v[2],
  ];
  const Jt = (w: V3): V3 => [
    cols[0]![0] * w[0] + cols[0]![1] * w[1] + cols[0]![2] * w[2],
    cols[1]![0] * w[0] + cols[1]![1] * w[1] + cols[1]![2] * w[2],
    cols[2]![0] * w[0] + cols[2]![1] * w[1] + cols[2]![2] * w[2],
  ];
  let v: V3 = [0.6, 0.48, 0.64];
  for (let it = 0; it < 60; it += 1) {
    const w = Jt(J(v));
    const l = Math.hypot(...w) || 1;
    v = [w[0] / l, w[1] / l, w[2] / l];
  }
  // a fixed sign, so the same release colours the same way
  const k = v[0] + v[1] + v[2] >= 0 ? 1 : -1;
  return [v[0] * k, v[1] * k, v[2] * k];
}

/** The nearest attractor sample to a ray (model space), within `maxDist`; null if none. */
export function pickOnAttractor(samples: Float64Array, origin: V3, dir: V3, maxDist: number): V3 | null {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < samples.length; i += 3) {
    const v: V3 = [samples[i]! - origin[0], samples[i + 1]! - origin[1], samples[i + 2]! - origin[2]];
    const t = v[0] * dir[0] + v[1] * dir[1] + v[2] * dir[2];
    if (t <= 0) continue;
    const perp = Math.hypot(v[0] - t * dir[0], v[1] - t * dir[1], v[2] - t * dir[2]);
    if (perp > maxDist) continue;
    // prefer the nearest point along the ray among the close ones
    const score = t + perp * 4;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best < 0 ? null : [samples[best]!, samples[best + 1]!, samples[best + 2]!];
}

/** Mean and RMS distance from the mean of packed xyz points (the attractor's size). */
export function spreadOf(points: Float64Array): { mean: V3; rms: number } {
  const n = points.length / 3;
  const m: V3 = [0, 0, 0];
  for (let i = 0; i < points.length; i += 3) {
    m[0] += points[i]!;
    m[1] += points[i + 1]!;
    m[2] += points[i + 2]!;
  }
  m[0] /= n;
  m[1] /= n;
  m[2] /= n;
  let s = 0;
  for (let i = 0; i < points.length; i += 3) {
    s += (points[i]! - m[0]) ** 2 + (points[i + 1]! - m[1]) ** 2 + (points[i + 2]! - m[2]) ** 2;
  }
  return { mean: m, rms: Math.sqrt(s / n) };
}
