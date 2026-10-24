// Swarm — The Order Dial's measurements (03-boids-2d.md § Signature moment):
// every (η, ρ) the visitor holds is measured from the live solver, never
// asserted. After a change the meter waits `relax` solver steps, then
// averages the exact φ samples over a window of at least `window` steps:
// ⟨φ⟩, the susceptibility χ = N·Var(φ) (the finite-size diagnostic of
// Baglietto, Albano & Candia 2012), and whether the trace has settled — the
// means of the window's two halves agree within `settleTol`. A point that is
// still drifting (a slow re-ordering, a metastable school) says so.

export interface MeterOptions {
  /** Solver steps to wait after a change before sampling. */
  relax: number;
  /** Steps of samples before a first measurement. */
  window: number;
  /** The window rolls: at most this many steps of samples are kept. */
  maxWindow: number;
  /** Largest |mean(second half) − mean(first half)| of a settled trace. */
  settleTol: number;
}

/** Declared defaults: relax 400 steps, measure over 600–2400 steps, settled within 0.02 in φ. */
export const METER: MeterOptions = { relax: 400, window: 600, maxWindow: 2400, settleTol: 0.02 };

export interface Measurement {
  eta: number;
  rho: number;
  /** ⟨φ⟩ over the window. */
  phi: number;
  /** N · Var(φ) over the window. */
  chi: number;
  sd: number;
  /** mean(second half) − mean(first half). */
  drift: number;
  settled: boolean;
  /** Steps the window spans, and its samples. */
  steps: number;
  samples: number;
  n: number;
  /** The solver step of the last sample. */
  tick: number;
}

export class OrderMeter {
  readonly opts: MeterOptions;
  eta = 0;
  rho = 0;
  n = 1;
  /** The step the current setting began at. */
  since = 0;
  private ticks: number[] = [];
  private phis: number[] = [];
  private lastTick = -1;

  constructor(opts: MeterOptions = METER) {
    this.opts = opts;
  }

  /** Start measuring a new setting from solver step `tick`. */
  reset(eta: number, rho: number, n: number, tick: number): void {
    this.eta = eta;
    this.rho = rho;
    this.n = n;
    this.since = tick;
    this.ticks.length = 0;
    this.phis.length = 0;
    this.lastTick = tick - 1;
  }

  /** 0 … 1: how far the current setting is towards its first measurement. */
  progress(tick: number): number {
    const need = this.opts.relax + this.opts.window;
    return Math.min(Math.max((tick - this.since) / need, 0), 1);
  }

  /**
   * Add a φ sample taken after solver step `tick`. Returns the measurement once
   * the window is long enough (and on every later sample), else null. Samples
   * from before the setting began, or out of order, are ignored.
   */
  push(tick: number, phi: number): Measurement | null {
    if (tick <= this.lastTick || !Number.isFinite(phi)) return null;
    this.lastTick = tick;
    if (tick < this.since + this.opts.relax) return null;
    this.ticks.push(tick);
    this.phis.push(phi);
    while (this.ticks.length > 2 && tick - this.ticks[0]! > this.opts.maxWindow) {
      this.ticks.shift();
      this.phis.shift();
    }
    const span = tick - this.ticks[0]!;
    if (span < this.opts.window || this.phis.length < 8) return null;
    return this.measure();
  }

  private measure(): Measurement {
    const x = this.phis;
    const m = x.length;
    let s = 0;
    for (const v of x) s += v;
    const mean = s / m;
    let q = 0;
    for (const v of x) q += (v - mean) * (v - mean);
    const variance = q / m;
    const half = Math.floor(m / 2);
    let a = 0;
    for (let i = 0; i < half; i += 1) a += x[i]!;
    let b = 0;
    for (let i = half; i < m; i += 1) b += x[i]!;
    const drift = b / (m - half) - a / half;
    return {
      eta: this.eta,
      rho: this.rho,
      phi: mean,
      chi: this.n * variance,
      sd: Math.sqrt(variance),
      drift,
      settled: Math.abs(drift) <= this.opts.settleTol,
      steps: this.ticks[m - 1]! - this.ticks[0]!,
      samples: m,
      n: this.n,
      tick: this.ticks[m - 1]!,
    };
  }
}

/** The map's key for a setting: η to 0.01, ρ to 1/20 of an octave. */
export const settingKey = (eta: number, rho: number): string => `${Math.round(eta * 100)}:${Math.round(Math.log2(rho) * 20)}`;

/**
 * η_c from a noise sweep: the χ peak, refined by a parabola through the peak
 * and its two neighbours when they exist (equal η spacing assumed).
 */
export function chiPeak(points: readonly { eta: number; chi: number }[]): { eta: number; chi: number; index: number } | null {
  if (points.length === 0) return null;
  let k = 0;
  for (let i = 1; i < points.length; i += 1) if (points[i]!.chi > points[k]!.chi) k = i;
  const p = points[k]!;
  if (k === 0 || k === points.length - 1) return { eta: p.eta, chi: p.chi, index: k };
  const a = points[k - 1]!;
  const c = points[k + 1]!;
  const den = a.chi - 2 * p.chi + c.chi;
  const h = (c.eta - a.eta) / 2;
  const off = den < 0 ? (0.5 * (a.chi - c.chi)) / den : 0;
  return { eta: p.eta + Math.max(-1, Math.min(1, off)) * h, chi: p.chi, index: k };
}
