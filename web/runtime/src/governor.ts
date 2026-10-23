// Quality governor (00-foundation.md § 4.5).
//
// Watches frame time; if the p90 over a 2 s window exceeds the budget, steps
// down — render scale first, then effect quality — and, as a last resort,
// flags a simulation-size step-down to apply at the next scene restart (size
// changes the physics, so it never happens silently mid-run). It never steps
// during a Prove run. Every step-down is reported with a plain message for
// the transport's status dot.

import { TimedWindow, percentile } from "./stats.js";

export type GovernorSource = "gpu" | "frame";

export interface GovernorOptions {
  /** p90 budget, ms. */
  budgetMs: number;
  windowMs?: number;
  /** Render-scale ladder, highest first. */
  scales?: readonly number[];
  /** Number of effect levels above "minimal" (e.g. 1 = full → reduced). */
  effectLevels?: number;
  /** Let the sim-size step-down be requested. */
  allowSimStepDown?: boolean;
}

export interface GovernorStatus {
  degraded: boolean;
  /** What changed, in plain words; empty when at full quality. */
  message: string;
  renderScale: number;
  effects: number;
  simStepDownPending: boolean;
}

export class QualityGovernor {
  readonly budgetMs: number;
  private readonly window: TimedWindow;
  private readonly scales: readonly number[];
  private scaleIndex = 0;
  private readonly effectLevels: number;
  effects: number;
  private readonly allowSim: boolean;
  simStepDownPending = false;
  /** Suspended during Prove runs and while the page is hidden. */
  suspended = false;
  private lastStepAt = 0;
  private readonly changes: string[] = [];
  onChange: ((s: GovernorStatus) => void) | null = null;

  constructor(opts: GovernorOptions) {
    this.budgetMs = opts.budgetMs;
    this.window = new TimedWindow(opts.windowMs ?? 2000);
    this.scales = opts.scales ?? [1, 0.85, 0.7, 0.55];
    this.effectLevels = opts.effectLevels ?? 1;
    this.effects = this.effectLevels;
    this.allowSim = opts.allowSimStepDown ?? true;
  }

  get renderScale(): number {
    return this.scales[this.scaleIndex]!;
  }

  /** Feed one frame's time (ms). */
  sample(ms: number, now = performance.now()): void {
    if (this.suspended || !Number.isFinite(ms)) return;
    this.window.push(ms, now);
    // need a full window, and a settle time after the last change
    if (this.window.span() < this.window.windowMs * 0.9 || now - this.lastStepAt < this.window.windowMs) return;
    const p90 = percentile(this.window.values(), 0.9);
    if (p90 <= this.budgetMs) return;
    this.stepDown(p90);
    this.lastStepAt = now;
    this.window.clear();
  }

  private stepDown(p90: number): void {
    const ms = `${p90.toFixed(1)} ms p90 over the ${this.budgetMs.toFixed(1)} ms budget`;
    if (this.scaleIndex < this.scales.length - 1) {
      this.scaleIndex += 1;
      this.changes.push(`render scale ${Math.round(this.renderScale * 100)}% (${ms})`);
    } else if (this.effects > 0) {
      this.effects -= 1;
      this.changes.push(`lighter effects (${ms})`);
    } else if (this.allowSim && !this.simStepDownPending) {
      this.simStepDownPending = true;
      this.changes.push(`smaller simulation at the next restart (${ms})`);
    } else {
      return;
    }
    this.onChange?.(this.status());
  }

  /** Scene restart: the pending size step-down has been applied (or declined). */
  acknowledgeRestart(): void {
    if (this.simStepDownPending) {
      this.simStepDownPending = false;
      this.onChange?.(this.status());
    }
  }

  /** Back to full quality (e.g. after a manual "quality: high" choice). */
  reset(): void {
    this.scaleIndex = 0;
    this.effects = this.effectLevels;
    this.simStepDownPending = false;
    this.changes.length = 0;
    this.window.clear();
    this.onChange?.(this.status());
  }

  status(): GovernorStatus {
    const degraded = this.scaleIndex > 0 || this.effects < this.effectLevels || this.simStepDownPending;
    return {
      degraded,
      message: degraded ? `Stepped down to hold the frame rate: ${this.changes.join("; ")}.` : "",
      renderScale: this.renderScale,
      effects: this.effects,
      simStepDownPending: this.simStepDownPending,
    };
  }
}
