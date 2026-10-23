// Rolling-window statistics for frame times.

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1));
  return s[i]!;
}

/** Samples kept for `windowMs` of wall time. */
export class TimedWindow {
  private readonly t: number[] = [];
  private readonly v: number[] = [];
  constructor(readonly windowMs: number) {}
  push(value: number, now: number): void {
    this.t.push(now);
    this.v.push(value);
    while (this.t.length > 0 && now - this.t[0]! > this.windowMs) {
      this.t.shift();
      this.v.shift();
    }
  }
  values(): readonly number[] {
    return this.v;
  }
  /** Wall time covered by the samples. */
  span(): number {
    return this.t.length > 1 ? this.t[this.t.length - 1]! - this.t[0]! : 0;
  }
  clear(): void {
    this.t.length = 0;
    this.v.length = 0;
  }
}
