// Camera2D (00-foundation.md § 3.3): pan/zoom over a 2D simulation domain
// with inertia, pinch, fly-to animation and fit-to-view, bounded to the
// domain plus a margin (or unbounded and wrapping for periodic domains).
//
// Units: the domain is measured in cells, y down (row 0 at the top), the
// viewport in CSS pixels. `pxPerUnit` is CSS px per cell; the shader gets
// scene-target px via `uniform(dpr * renderScale)`.

export interface CameraState {
  cx: number;
  cy: number;
  pxPerUnit: number;
}

export interface CameraUniform {
  cx: number;
  cy: number;
  /** domain units per scene-target pixel */
  unitsPerPx: number;
}

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Camera2D {
  cx = 0;
  cy = 0;
  pxPerUnit = 1;
  viewW = 1;
  viewH = 1;
  domainW = 1;
  domainH = 1;
  periodic = false;
  /** Visible margin beyond a non-periodic domain, as a fraction of the cover zoom. */
  margin = 0.12;
  /** Max zoom, CSS px per cell. */
  maxPxPerUnit = 40;
  /** Honour prefers-reduced-motion: no animated flights, no inertia. */
  reducedMotion = false;

  private vx = 0;
  private vy = 0;
  private flight: { from: CameraState; to: CameraState; t0: number; ms: number } | null = null;
  /** Bumped on every change, so renderers can skip unchanged frames. */
  version = 0;

  setViewport(w: number, h: number): void {
    const changed = w !== this.viewW || h !== this.viewH;
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
    if (changed) {
      this.clamp();
      this.version += 1;
    }
  }

  setDomain(w: number, h: number, periodic: boolean): void {
    this.domainW = w;
    this.domainH = h;
    this.periodic = periodic;
    this.clamp();
    this.version += 1;
  }

  /** Zoom at which the domain exactly covers the viewport (no bars, may crop). */
  coverZoom(): number {
    return Math.max(this.viewW / this.domainW, this.viewH / this.domainH);
  }

  minZoom(): number {
    return this.periodic ? this.coverZoom() * 0.5 : this.coverZoom() / (1 + this.margin);
  }

  state(): CameraState {
    return { cx: this.cx, cy: this.cy, pxPerUnit: this.pxPerUnit };
  }

  set(s: CameraState): void {
    this.flight = null;
    this.cx = s.cx;
    this.cy = s.cy;
    this.pxPerUnit = s.pxPerUnit;
    this.clamp();
    this.version += 1;
  }

  /** Centre the domain and cover the viewport; `zoom` multiplies the cover zoom. */
  fit(zoom = 1, animate = false): void {
    const target = { cx: this.domainW / 2, cy: this.domainH / 2, pxPerUnit: this.coverZoom() * zoom };
    if (animate) this.flyTo(target, 420);
    else this.set(target);
  }

  screenToDomain(sx: number, sy: number): [number, number] {
    return [this.cx + (sx - this.viewW / 2) / this.pxPerUnit, this.cy + (sy - this.viewH / 2) / this.pxPerUnit];
  }

  /** For periodic domains the image of (x, y) nearest the view centre. */
  domainToScreen(x: number, y: number): [number, number] {
    let dx = x - this.cx;
    let dy = y - this.cy;
    if (this.periodic) {
      dx -= Math.round(dx / this.domainW) * this.domainW;
      dy -= Math.round(dy / this.domainH) * this.domainH;
    }
    return [this.viewW / 2 + dx * this.pxPerUnit, this.viewH / 2 + dy * this.pxPerUnit];
  }

  /** Visible domain rectangle [x0, y0, x1, y1]. */
  viewRect(): [number, number, number, number] {
    const hw = this.viewW / 2 / this.pxPerUnit;
    const hh = this.viewH / 2 / this.pxPerUnit;
    return [this.cx - hw, this.cy - hh, this.cx + hw, this.cy + hh];
  }

  panBy(dxCss: number, dyCss: number): void {
    this.flight = null;
    this.cx -= dxCss / this.pxPerUnit;
    this.cy -= dyCss / this.pxPerUnit;
    this.clamp();
    this.version += 1;
  }

  /** Release velocity from a drag, in CSS px / s. */
  fling(vxCss: number, vyCss: number): void {
    if (this.reducedMotion) return;
    this.vx = -vxCss / this.pxPerUnit;
    this.vy = -vyCss / this.pxPerUnit;
  }

  stop(): void {
    this.vx = 0;
    this.vy = 0;
    this.flight = null;
  }

  zoomAt(factor: number, sx: number, sy: number): void {
    this.flight = null;
    const [x, y] = this.screenToDomain(sx, sy);
    this.pxPerUnit = Math.min(Math.max(this.pxPerUnit * factor, this.minZoom()), this.maxPxPerUnit);
    // keep the domain point under the cursor fixed
    this.cx = x - (sx - this.viewW / 2) / this.pxPerUnit;
    this.cy = y - (sy - this.viewH / 2) / this.pxPerUnit;
    this.clamp();
    this.version += 1;
  }

  flyTo(to: CameraState, ms = 900): void {
    if (this.reducedMotion || ms <= 0) {
      this.set(to);
      return;
    }
    this.vx = 0;
    this.vy = 0;
    this.flight = { from: this.state(), to, t0: performance.now(), ms };
  }

  get flying(): boolean {
    return this.flight !== null;
  }

  /** Advance inertia / flights. Returns true while the camera is moving. */
  update(dtSec: number, now = performance.now()): boolean {
    if (this.flight) {
      const f = this.flight;
      const t = Math.min((now - f.t0) / f.ms, 1);
      const e = easeInOut(t);
      // zoom interpolates geometrically, centre in screen space of the target zoom
      const z = f.from.pxPerUnit * (f.to.pxPerUnit / f.from.pxPerUnit) ** e;
      this.cx = f.from.cx + (f.to.cx - f.from.cx) * e;
      this.cy = f.from.cy + (f.to.cy - f.from.cy) * e;
      this.pxPerUnit = z;
      if (t >= 1) this.flight = null;
      this.clamp();
      this.version += 1;
      return true;
    }
    if (Math.abs(this.vx) + Math.abs(this.vy) > 1e-3) {
      this.cx += this.vx * dtSec;
      this.cy += this.vy * dtSec;
      const k = Math.exp(-dtSec / 0.28);
      this.vx *= k;
      this.vy *= k;
      this.clamp();
      this.version += 1;
      return true;
    }
    this.vx = 0;
    this.vy = 0;
    return false;
  }

  clamp(): void {
    this.pxPerUnit = Math.min(Math.max(this.pxPerUnit, this.minZoom()), this.maxPxPerUnit);
    if (this.periodic) {
      this.cx = ((this.cx % this.domainW) + this.domainW) % this.domainW;
      this.cy = ((this.cy % this.domainH) + this.domainH) % this.domainH;
      return;
    }
    // keep the view inside domain + margin (margin measured in visible units)
    const hw = this.viewW / 2 / this.pxPerUnit;
    const hh = this.viewH / 2 / this.pxPerUnit;
    const mx = this.domainW * this.margin * 0.5;
    const my = this.domainH * this.margin * 0.5;
    const clampAxis = (c: number, half: number, size: number, m: number): number => {
      const lo = half - m;
      const hi = size - half + m;
      return lo > hi ? size / 2 : Math.min(Math.max(c, lo), hi);
    };
    this.cx = clampAxis(this.cx, hw, this.domainW, mx);
    this.cy = clampAxis(this.cy, hh, this.domainH, my);
  }

  uniform(pixelScale: number): CameraUniform {
    return { cx: this.cx, cy: this.cy, unitsPerPx: 1 / (this.pxPerUnit * pixelScale) };
  }
}
