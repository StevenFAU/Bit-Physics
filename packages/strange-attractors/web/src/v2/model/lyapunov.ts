// Lyapunov exponents of the Lorenz system in f64 (05-strange-attractors.md,
// "The proof" and "Learn"): Benettin et al. 1980's algorithm. One
// trajectory carries three tangent vectors; each step integrates the state
// by RK4 and the tangent vectors by RK4 of the variational equation at the
// same four stage points (the linearisation of the very step the state
// takes). Every `every` steps the vectors are re-orthonormalised by
// modified Gram–Schmidt (a QR factorisation); the logs of R's diagonal,
// summed and divided by the time, converge to λ₁ ≥ λ₂ ≥ λ₃.
//
// The sum λ₁ + λ₂ + λ₃ is the time average of the Jacobian's trace, which
// for Lorenz is the constant −(σ + 1 + β): the analytic check. With exact
// arithmetic the QR logs sum to log |det| of the discrete flow map, so what
// is left is RK4's volume error and rounding.
//
// Uncertainty: the run is cut into blocks of `blockT` time units; the
// standard error is the spread of the block means / √(blocks).

import type { LorenzParams, V3 } from "./lorenz.js";
import { DT, rk4Step } from "./lorenz.js";

export interface LyapunovEstimate {
  /** λ₁, λ₂, λ₃ (per unit time). */
  lambdas: [number, number, number];
  /** Standard errors from block means. */
  se: [number, number, number];
  /** Time averaged over (after the transient). */
  t: number;
  /** Blocks behind the standard error. */
  blocks: number;
}

/** Kaplan–Yorke (Lyapunov) dimension from an ordered spectrum. */
export function kaplanYorke(l: readonly number[]): number {
  let sum = 0;
  for (let j = 0; j < l.length; j += 1) {
    if (sum + l[j]! < 0) return j + sum / Math.abs(l[j]!);
    sum += l[j]!;
  }
  return l.length;
}

/** −(σ + 1 + β): the Jacobian's trace, the exact sum of the spectrum. */
export const traceOf = (p: LorenzParams): number => -(p.sigma + 1 + p.beta);

export class LyapunovEstimator {
  x: V3;
  /** Tangent vectors (orthonormal after each re-orthonormalisation). */
  private readonly v: V3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  private readonly logSum: [number, number, number] = [0, 0, 0];
  private readonly blockSum: [number, number, number] = [0, 0, 0];
  private blockSteps = 0;
  private readonly blockMeans: [number, number, number][] = [];
  private stepsSinceQr = 0;
  /** Steps taken since the transient ended (averaging time / dt). */
  steps = 0;
  private transientLeft: number;

  constructor(
    readonly params: LorenzParams,
    x0: V3 = [1, 1, 1],
    readonly dt = DT,
    readonly every = 10,
    transientT = 20,
    readonly blockT = 50,
  ) {
    this.x = [...x0];
    this.transientLeft = Math.round(transientT / dt);
  }

  /** Advance n steps. */
  step(n: number): void {
    const p = this.params;
    const dt = this.dt;
    const lin = (s: V3, e: V3): V3 => [
      p.sigma * (e[1] - e[0]),
      e[0] * (p.rho - s[2]) - s[0] * e[2] - e[1],
      s[0] * e[1] + s[1] * e[0] - p.beta * e[2],
    ];
    for (let i = 0; i < n; i += 1) {
      const { next, stages } = rk4Step(p, this.x, dt);
      for (let c = 0; c < 3; c += 1) {
        const e = this.v[c]!;
        const d1 = lin(stages[0], e);
        const e2: V3 = [e[0] + 0.5 * dt * d1[0], e[1] + 0.5 * dt * d1[1], e[2] + 0.5 * dt * d1[2]];
        const d2 = lin(stages[1], e2);
        const e3: V3 = [e[0] + 0.5 * dt * d2[0], e[1] + 0.5 * dt * d2[1], e[2] + 0.5 * dt * d2[2]];
        const d3 = lin(stages[2], e3);
        const e4: V3 = [e[0] + dt * d3[0], e[1] + dt * d3[1], e[2] + dt * d3[2]];
        const d4 = lin(stages[3], e4);
        this.v[c] = [
          e[0] + (dt / 6) * (d1[0] + 2 * d2[0] + 2 * d3[0] + d4[0]),
          e[1] + (dt / 6) * (d1[1] + 2 * d2[1] + 2 * d3[1] + d4[1]),
          e[2] + (dt / 6) * (d1[2] + 2 * d2[2] + 2 * d3[2] + d4[2]),
        ];
      }
      this.x = next;
      this.stepsSinceQr += 1;
      if (this.stepsSinceQr >= this.every) this.qr();
    }
  }

  /** Modified Gram–Schmidt; logs of R's diagonal feed the sums (after the transient). */
  private qr(): void {
    const k = this.stepsSinceQr;
    this.stepsSinceQr = 0;
    const r: [number, number, number] = [0, 0, 0];
    for (let c = 0; c < 3; c += 1) {
      let a = this.v[c]!;
      for (let j = 0; j < c; j += 1) {
        const q = this.v[j]!;
        const d = a[0] * q[0] + a[1] * q[1] + a[2] * q[2];
        a = [a[0] - d * q[0], a[1] - d * q[1], a[2] - d * q[2]];
      }
      const n = Math.hypot(a[0], a[1], a[2]);
      r[c] = n;
      this.v[c] = [a[0] / n, a[1] / n, a[2] / n];
    }
    if (this.transientLeft > 0) {
      this.transientLeft -= k;
      return;
    }
    for (let c = 0; c < 3; c += 1) {
      const l = Math.log(r[c]!);
      this.logSum[c] += l;
      this.blockSum[c] += l;
    }
    this.steps += k;
    this.blockSteps += k;
    if (this.blockSteps * this.dt >= this.blockT - 1e-9) {
      const T = this.blockSteps * this.dt;
      this.blockMeans.push([this.blockSum[0] / T, this.blockSum[1] / T, this.blockSum[2] / T]);
      this.blockSum[0] = this.blockSum[1] = this.blockSum[2] = 0;
      this.blockSteps = 0;
    }
  }

  get averagingT(): number {
    return this.steps * this.dt;
  }

  estimate(): LyapunovEstimate {
    const t = this.averagingT;
    const lambdas: [number, number, number] = t > 0 ? [this.logSum[0] / t, this.logSum[1] / t, this.logSum[2] / t] : [0, 0, 0];
    const b = this.blockMeans.length;
    const se: [number, number, number] = [Infinity, Infinity, Infinity];
    if (b >= 2) {
      for (let c = 0; c < 3; c += 1) {
        const m = this.blockMeans.reduce((s, x) => s + x[c]!, 0) / b;
        const v = this.blockMeans.reduce((s, x) => s + (x[c]! - m) ** 2, 0) / (b - 1);
        se[c] = Math.sqrt(v / b);
      }
    }
    return { lambdas, se, t, blocks: b };
  }
}

/** Run an estimator for `T` time units of averaging (after its transient). */
export function lyapunovSpectrum(p: LorenzParams, T: number, o: { x0?: V3; every?: number; transientT?: number; blockT?: number } = {}): LyapunovEstimate {
  const est = new LyapunovEstimator(p, o.x0 ?? [1, 1, 1], DT, o.every ?? 10, o.transientT ?? 20, o.blockT ?? 50);
  const total = Math.round((T + (o.transientT ?? 20)) / DT);
  est.step(total);
  return est.estimate();
}
