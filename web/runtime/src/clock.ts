// Fixed-step simulation clock (00-foundation.md § 4.1).
//
// The simulation advances in whole *ticks* (a sim-defined bundle of solver
// steps). Real time × speed accumulates into ticks; a frame runs as many as
// have accrued, capped so a slow frame never snowballs. Because uniforms and
// edits change only at tick boundaries, a replay that runs the same ticks
// reproduces the same bytes regardless of frame pacing.

export class SimClock {
  /** Ticks per second at 1× speed. */
  ticksPerSecond: number;
  /** 0.25× – 8×. */
  speed = 1;
  paused = false;
  /** Hard cap per frame (protects slow devices). */
  maxTicksPerFrame: number;
  /** Total ticks run since the scene started. */
  tick = 0;
  private acc = 0;
  private stepRequests = 0;

  constructor(ticksPerSecond: number, maxTicksPerFrame = 32) {
    this.ticksPerSecond = ticksPerSecond;
    this.maxTicksPerFrame = maxTicksPerFrame;
  }

  /** Request one tick on the next frame even while paused. */
  stepOnce(): void {
    this.stepRequests += 1;
  }

  /** How many ticks this frame should run (does not advance `tick`). */
  due(dtSec: number): number {
    if (this.paused) {
      const n = Math.min(this.stepRequests, this.maxTicksPerFrame);
      this.stepRequests -= n;
      this.acc = 0;
      return n;
    }
    this.stepRequests = 0;
    this.acc += Math.min(dtSec, 0.1) * this.ticksPerSecond * this.speed;
    const n = Math.min(Math.floor(this.acc), this.maxTicksPerFrame);
    this.acc -= n;
    if (this.acc > this.maxTicksPerFrame) this.acc = 0; // drop backlog rather than catch up forever
    return n;
  }

  /** Record that `n` ticks ran. */
  advance(n: number): void {
    this.tick += n;
  }

  reset(): void {
    this.tick = 0;
    this.acc = 0;
    this.stepRequests = 0;
  }
}
