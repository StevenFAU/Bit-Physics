// The Order Dial's controller: keeps the panel (./order-dial.ts), the meter
// (./model/meter.ts) and the live Vicsek flock in step. Each setting the
// visitor holds is measured from the live solver; a sweep turns the dial by
// itself across η at the current crowding, from an ordered school upwards,
// and locates η_c at the χ peak.

import type { App } from "./app.js";
import type { VicsekParams } from "./model/brains.js";
import type { OrderParams } from "./model/flock.js";
import type { Measurement } from "./model/meter.js";
import { METER, OrderMeter, chiPeak } from "./model/meter.js";
import { OrderDialPanel } from "./order-dial.js";
import { RHO_RANGE, vicsekFor, vicsekRho } from "./scenes.js";

/** The sweep: η from 0.05 to 0.80 in steps of 0.05, each held until settled over ≥ 800 steps (or 2,400 steps at most). */
export const SWEEP = {
  etas: Array.from({ length: 16 }, (_, i) => Number((0.05 + 0.05 * i).toFixed(2))),
  minSteps: 800,
  speed: 8,
} as const;

/**
 * Is a sweep's current setting done? Settled over at least `minSteps`, or —
 * settled or not — held for its relaxation plus the meter's longest window.
 * `elapsed` is solver steps since the setting began: the rolling window's own
 * span is trimmed below maxWindow, so it cannot serve as the timeout.
 */
export function sweepPointDone(m: Measurement | null, elapsed: number): boolean {
  if (!m) return false;
  return (m.settled && m.steps >= SWEEP.minSteps) || elapsed >= METER.relax + METER.maxWindow;
}

export interface SweepResult {
  rho: number;
  n: number;
  points: Measurement[];
  etaC: number | null;
  complete: boolean;
}

const roundRho = (rho: number): number => Number((2 ** (Math.round(Math.log2(rho) * 20) / 20)).toFixed(4));

export class DialController {
  readonly panel: OrderDialPanel;
  readonly meter = new OrderMeter(METER);
  last: Measurement | null = null;
  eta = 0;
  rho = 1;
  sweeping = false;
  lastSweep: SweepResult | null = null;
  onSweep: ((r: SweepResult) => void) | null = null;
  private attached = false;
  /** True while the controller itself changes the brain (its own onBrain echo is ignored). */
  private applying = false;
  private waiter: ((m: Measurement | null) => void) | null = null;
  private cancelled = false;

  constructor(
    private readonly app: App,
    private readonly stage: HTMLElement,
  ) {
    this.panel = new OrderDialPanel({
      set: (eta, rho, phase) => this.set(eta, rho, phase),
      sweep: () => void this.sweep(),
      cancelSweep: () => this.cancel(),
      clear: () => {
        this.panel.clearPoints();
        this.lastSweep = null;
      },
    });
  }

  /** Show the panel while The Order Dial is the scene. */
  attach(on: boolean): void {
    if (on === this.attached) return;
    // leaving the scene ends a running sweep, so its cleanup (speed, controls) runs
    if (!on && this.sweeping) this.cancel();
    this.attached = on;
    if (on) this.stage.append(this.panel.el);
    else this.panel.el.remove();
  }

  /** The flock changed under us (scene load, restart, restore): read its setting and measure afresh. */
  sync(): void {
    const b = this.app.flock.brain;
    if (!b || b.kind !== "vicsek") return;
    this.eta = b.p.eta;
    this.rho = roundRho(vicsekRho(b.p.r));
    this.panel.setSetting(this.eta, this.rho);
    this.panel.resetTrace();
    this.restartMeter();
  }

  /**
   * The brain changed from outside the dial (Tune's reset, a restore): follow
   * the new setting and measure it afresh, keeping the φ trace.
   */
  brainChanged(): void {
    if (this.applying || !this.attached) return;
    const b = this.app.flock.brain;
    if (!b || b.kind !== "vicsek") return;
    const eta = b.p.eta;
    const rho = roundRho(vicsekRho(b.p.r));
    if (eta === this.eta && rho === this.rho) return;
    // a sweep holds its own setting: a change from outside ends it
    if (this.sweeping) this.cancel();
    this.eta = eta;
    this.rho = rho;
    this.panel.setSetting(eta, rho);
    this.restartMeter();
  }

  private restartMeter(): void {
    this.meter.reset(this.eta, this.rho, this.app.flock.n, this.app.flock.tick);
    this.last = null;
    this.panel.setMeasurement(null, 0);
    this.panel.setStatus(this.sweeping ? this.sweepStatus() : "Measuring…");
  }

  /** The visitor turned the dial or changed the crowding. */
  set(eta: number, rho: number, phase: "start" | "move" | "end"): void {
    if (this.sweeping) return;
    this.apply(eta, rho, phase);
  }

  private apply(eta: number, rho: number, phase: "start" | "move" | "end"): void {
    const r = Math.min(Math.max(rho, RHO_RANGE[0]), RHO_RANGE[1]);
    this.eta = Math.min(Math.max(eta, 0), 1);
    this.rho = roundRho(r);
    const p: VicsekParams = vicsekFor(this.rho, this.eta);
    this.applying = true;
    try {
      this.app.setBrain({ kind: "vicsek", p }, phase);
    } finally {
      this.applying = false;
    }
    this.panel.setSetting(this.eta, this.rho);
    this.restartMeter();
  }

  /** A live φ sample from the exact reduction. */
  onOrder(o: OrderParams, tick: number): void {
    if (!this.attached) return;
    this.panel.pushPhi(o.phi);
    const m = this.meter.push(tick, o.phi);
    if (m) this.last = m;
    const prog = this.meter.progress(tick);
    this.panel.setMeasurement(this.last, prog);
    if (this.sweeping) {
      this.panel.setStatus(this.sweepStatus());
      if (this.waiter && sweepPointDone(this.last, tick - this.meter.since)) {
        const w = this.waiter;
        this.waiter = null;
        w(this.last);
      }
      return;
    }
    if (!this.last) this.panel.setStatus(`Measuring… ${Math.round(prog * 100)}%`);
    else if (this.last.settled) this.panel.setStatus(`Settled: ⟨φ⟩ ${this.last.phi.toFixed(3)} over ${this.last.steps.toLocaleString()} steps`);
    else this.panel.setStatus(`Still changing: φ moved ${this.last.drift > 0 ? "+" : ""}${this.last.drift.toFixed(3)} across the window`);
  }

  private sweepIndex = 0;
  private sweepStatus(): string {
    return `Sweep: η ${this.eta.toFixed(2)} (${this.sweepIndex + 1} of ${SWEEP.etas.length})`;
  }

  cancel(): void {
    this.cancelled = true;
    const w = this.waiter;
    this.waiter = null;
    w?.(null);
  }

  /**
   * Turn the dial across SWEEP.etas at the current crowding, starting from an
   * ordered school (the scene's start, same seed), holding each η until its
   * measurement settles. Resolves with what was measured.
   */
  async sweep(): Promise<SweepResult | null> {
    if (this.sweeping || this.app.scene.id !== "order-dial") return null;
    const app = this.app;
    const rho = this.rho;
    this.sweeping = true;
    this.cancelled = false;
    this.panel.setSweeping(true);
    const speed0 = app.clock.speed;
    const paused0 = app.clock.paused;
    const points: Measurement[] = [];
    let n = app.flock.n;
    try {
      await app.loadScene("order-dial", { seed: app.seed, brain: { kind: "vicsek", p: vicsekFor(rho, SWEEP.etas[0]!) } });
      n = app.flock.n;
      app.setSpeed(SWEEP.speed);
      if (app.clock.paused) app.togglePlay();
      for (let k = 0; k < SWEEP.etas.length && !this.cancelled; k += 1) {
        this.sweepIndex = k;
        this.apply(SWEEP.etas[k]!, rho, "end");
        const m = await new Promise<Measurement | null>((resolve) => (this.waiter = resolve));
        if (!m) break;
        points.push(m);
      }
    } finally {
      this.waiter = null;
      this.sweeping = false;
      this.panel.setSweeping(false);
      app.setSpeed(speed0);
      if (app.clock.paused !== paused0) app.togglePlay();
    }
    const peak = chiPeak(points);
    const res: SweepResult = { rho, n, points, etaC: peak ? peak.eta : null, complete: points.length === SWEEP.etas.length };
    this.lastSweep = res;
    this.panel.setEtaC(res.etaC !== null && res.complete ? { eta: res.etaC, rho } : null);
    this.panel.setStatus(
      res.complete && res.etaC !== null
        ? `Sweep done: η_c ≈ ${res.etaC.toFixed(2)} at ρ ${rho} (the χ peak)`
        : `Sweep stopped after ${points.length} of ${SWEEP.etas.length} settings`,
    );
    this.onSweep?.(res);
    return res;
  }
}
