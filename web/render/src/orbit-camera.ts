// OrbitCamera (00-foundation.md § 3.3): orbit / dolly / pan around a target
// with damping, a ground the eye never goes below, saved views, reset
// (double-click), and an optional slow turntable that is off under reduced
// motion. It implements the same gesture surface as Camera2D (panBy, zoomAt,
// fling, stop, fit), so @bp/studio's CanvasInput drives either: a drag
// orbits, the wheel or a pinch dollies, double-click resets.
//
// Conventions: right-handed world, y up. Angles in radians; yaw turns about
// +y (yaw 0 looks down −z from +z), pitch lifts the eye above the target's
// horizon. Matrices are column-major Float32Array(16) for WGSL mat4x4<f32>,
// with WebGPU clip depth in [0, 1]. Screen coordinates are CSS px, y down.

export type Vec3 = [number, number, number];

export interface OrbitState {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
}

export interface Ray {
  origin: Vec3;
  /** Unit direction. */
  dir: Vec3;
}

const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** Shortest signed angle from a to b. */
const angleDelta = (a: number, b: number): number => {
  const d = (b - a) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
};

export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm3 = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Column-major perspective projection, WebGPU depth range [0, 1]. */
export function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array<ArrayBuffer> {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = far / (near - far);
  m[11] = -1;
  m[14] = (near * far) / (near - far);
  return m;
}

/** Column-major view matrix looking from `eye` at `at`. */
export function lookAt(eye: Vec3, at: Vec3, up: Vec3 = [0, 1, 0]): Float32Array<ArrayBuffer> {
  const z = norm3(sub3(eye, at));
  const x = norm3(cross3(up, z));
  const y = cross3(z, x);
  const m = new Float32Array(16);
  m.set([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1]);
  return m;
}

/** Column-major a · b. */
export function mul4(a: Float32Array, b: Float32Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[k * 4 + r]! * b[c * 4 + k]!;
      out[c * 4 + r] = s;
    }
  }
  return out;
}

export class OrbitCamera {
  /** The damped, rendered state. */
  yaw = 0.6;
  pitch = 0.35;
  distance = 3;
  target: Vec3 = [0, 0, 0];
  /** Vertical field of view, radians. */
  fovY = (38 * Math.PI) / 180;
  near = 0.02;
  far = 100;
  viewW = 1;
  viewH = 1;
  minDistance = 0.4;
  maxDistance = 20;
  minPitch = -1.45;
  maxPitch = 1.45;
  /** World height of the floor the eye may not pass below (null = no floor). */
  ground: number | null = null;
  /** Radians of yaw per CSS px of drag. */
  orbitSpeed = 0.006;
  /** Turntable rate, radians per second (0 = off). Ignored under reduced motion. */
  autoRotate = 0;
  /** Seconds after the last interaction before the turntable resumes. */
  autoRotateDelay = 2.5;
  /** Damping time constant, seconds (smoothing of every gesture). */
  damping = 0.12;
  /** Honour prefers-reduced-motion: no turntable, no inertia, no flights, no smoothing. */
  reducedMotion = false;
  /** Bumped on every change, so renderers and URL writers can skip unchanged frames. */
  version = 0;

  private goal: OrbitState = { yaw: 0.6, pitch: 0.35, distance: 3, target: [0, 0, 0] };
  private home: OrbitState = { yaw: 0.6, pitch: 0.35, distance: 3, target: [0, 0, 0] };
  private readonly views = new Map<string, OrbitState>();
  private vYaw = 0;
  private vPitch = 0;
  private lastInput = -Infinity;
  private flight: { from: OrbitState; to: OrbitState; t0: number; ms: number } | null = null;

  setViewport(w: number, h: number): void {
    if (w === this.viewW && h === this.viewH) return;
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
    this.version += 1;
  }

  get aspect(): number {
    return this.viewW / this.viewH;
  }

  /** Set the home view (what reset/double-click returns to) and jump there. */
  setHome(s: OrbitState): void {
    this.home = copy(s);
    this.set(s);
  }

  state(): OrbitState {
    return { yaw: this.goal.yaw, pitch: this.goal.pitch, distance: this.goal.distance, target: [...this.goal.target] };
  }

  /** Jump (no smoothing) to a state. */
  set(s: OrbitState): void {
    this.flight = null;
    this.vYaw = 0;
    this.vPitch = 0;
    this.goal = this.clampState(copy(s));
    this.yaw = this.goal.yaw;
    this.pitch = this.goal.pitch;
    this.distance = this.goal.distance;
    this.target = [...this.goal.target];
    this.version += 1;
  }

  saveView(name: string): void {
    this.views.set(name, this.state());
  }

  recallView(name: string, animate = true): boolean {
    const v = this.views.get(name);
    if (!v) return false;
    if (animate) this.flyTo(v);
    else this.set(v);
    return true;
  }

  /** Animate to a state (an instant jump under reduced motion). */
  flyTo(to: OrbitState, ms = 900): void {
    const target = this.clampState(copy(to));
    if (this.reducedMotion || ms <= 0) {
      this.set(target);
      return;
    }
    this.vYaw = 0;
    this.vPitch = 0;
    const from = { yaw: this.yaw, pitch: this.pitch, distance: this.distance, target: [...this.target] as Vec3 };
    target.yaw = from.yaw + angleDelta(from.yaw, target.yaw);
    this.flight = { from, to: target, t0: performance.now(), ms };
    this.goal = copy(target);
  }

  get flying(): boolean {
    return this.flight !== null;
  }

  // ---- the CameraLike gesture surface (@bp/studio CanvasInput) ----------------

  /** A drag: orbit. */
  panBy(dxCss: number, dyCss: number): void {
    this.touch();
    this.flight = null;
    this.goal.yaw -= dxCss * this.orbitSpeed;
    this.goal.pitch += dyCss * this.orbitSpeed;
    this.goal = this.clampState(this.goal);
    if (this.reducedMotion) this.snap();
    this.version += 1;
  }

  /** Move the target in the view plane by a screen-space drag (CSS px). */
  truck(dxCss: number, dyCss: number): void {
    this.touch();
    this.flight = null;
    const worldPerPx = (2 * this.goal.distance * Math.tan(this.fovY / 2)) / this.viewH;
    const { right, up } = this.basis(this.goal);
    for (let i = 0; i < 3; i += 1) {
      this.goal.target[i] = this.goal.target[i]! - right[i]! * dxCss * worldPerPx + up[i]! * dyCss * worldPerPx;
    }
    this.goal = this.clampState(this.goal);
    if (this.reducedMotion) this.snap();
    this.version += 1;
  }

  /** Wheel / pinch: dolly towards the target (factor > 1 moves closer). */
  zoomAt(factor: number, _sx?: number, _sy?: number): void {
    this.touch();
    this.flight = null;
    this.goal.distance = clamp(this.goal.distance / factor, this.minDistance, this.maxDistance);
    this.goal = this.clampState(this.goal);
    if (this.reducedMotion) this.snap();
    this.version += 1;
  }

  /** Release velocity from a drag, CSS px / s: keeps orbiting and decays. */
  fling(vxCss: number, vyCss: number): void {
    if (this.reducedMotion) return;
    this.vYaw = -vxCss * this.orbitSpeed;
    this.vPitch = vyCss * this.orbitSpeed;
  }

  stop(): void {
    this.touch();
    this.vYaw = 0;
    this.vPitch = 0;
    this.flight = null;
  }

  /** Double-click / "0": back to the home view; `zoom` divides its distance. */
  fit(zoom = 1, animate = false): void {
    const to = copy(this.home);
    to.distance /= zoom;
    this.touch();
    if (animate) this.flyTo(to, 600);
    else this.set(to);
  }

  /** Advance damping, inertia, flights and the turntable. True while moving. */
  update(dtSec: number, now = performance.now()): boolean {
    const dt = Math.min(Math.max(dtSec, 0), 0.1);
    let moving = false;
    if (this.flight) {
      const f = this.flight;
      const t = Math.min((now - f.t0) / f.ms, 1);
      const e = easeInOut(t);
      this.yaw = f.from.yaw + (f.to.yaw - f.from.yaw) * e;
      this.pitch = f.from.pitch + (f.to.pitch - f.from.pitch) * e;
      this.distance = f.from.distance * (f.to.distance / f.from.distance) ** e;
      this.target = [0, 1, 2].map((i) => f.from.target[i]! + (f.to.target[i]! - f.from.target[i]!) * e) as Vec3;
      if (t >= 1) {
        this.flight = null;
        this.goal = copy(f.to);
      }
      this.version += 1;
      return true;
    }
    if (!this.reducedMotion) {
      if (Math.abs(this.vYaw) + Math.abs(this.vPitch) > 1e-4) {
        this.goal.yaw += this.vYaw * dt;
        this.goal.pitch += this.vPitch * dt;
        const k = Math.exp(-dt / 0.35);
        this.vYaw *= k;
        this.vPitch *= k;
        this.goal = this.clampState(this.goal);
        moving = true;
      } else {
        this.vYaw = 0;
        this.vPitch = 0;
      }
      if (this.autoRotate !== 0 && now - this.lastInput > this.autoRotateDelay * 1000) {
        this.goal.yaw += this.autoRotate * dt;
        moving = true;
      }
    }
    const a = this.reducedMotion ? 1 : 1 - Math.exp(-dt / Math.max(this.damping, 1e-4));
    const dy = this.goal.yaw - this.yaw;
    const dp = this.goal.pitch - this.pitch;
    const dd = this.goal.distance - this.distance;
    const dtg = sub3(this.goal.target, this.target);
    if (Math.abs(dy) + Math.abs(dp) + Math.abs(dd) + Math.abs(dtg[0]) + Math.abs(dtg[1]) + Math.abs(dtg[2]) > 1e-6) {
      this.yaw += dy * a;
      this.pitch += dp * a;
      this.distance += dd * a;
      this.target = [this.target[0] + dtg[0] * a, this.target[1] + dtg[1] * a, this.target[2] + dtg[2] * a];
      moving = true;
    } else if (!moving) {
      return false;
    }
    this.version += 1;
    return moving;
  }

  /** The turntable is idle-gated: any gesture holds it for `autoRotateDelay`. */
  private touch(): void {
    this.lastInput = performance.now();
  }

  private snap(): void {
    this.yaw = this.goal.yaw;
    this.pitch = this.goal.pitch;
    this.distance = this.goal.distance;
    this.target = [...this.goal.target];
  }

  private clampState(s: OrbitState): OrbitState {
    s.distance = clamp(s.distance, this.minDistance, this.maxDistance);
    let lo = this.minPitch;
    if (this.ground !== null) {
      // keep the eye a little above the floor: target.y + d·sin(pitch) ≥ ground + 2% of d
      const need = (this.ground - s.target[1]) / s.distance + 0.02;
      if (need > -1 && need < 1) lo = Math.max(lo, Math.asin(need));
    }
    s.pitch = clamp(s.pitch, lo, this.maxPitch);
    return s;
  }

  private basis(s: OrbitState): { fwd: Vec3; right: Vec3; up: Vec3 } {
    const cp = Math.cos(s.pitch);
    // eye offset direction from the target
    const back: Vec3 = [cp * Math.sin(s.yaw), Math.sin(s.pitch), cp * Math.cos(s.yaw)];
    const fwd: Vec3 = [-back[0], -back[1], -back[2]];
    const right = norm3(cross3(fwd, [0, 1, 0]));
    const up = cross3(right, fwd);
    return { fwd, right, up };
  }

  /** World-space eye position (rendered state). */
  eye(): Vec3 {
    const cp = Math.cos(this.pitch);
    return [
      this.target[0] + this.distance * cp * Math.sin(this.yaw),
      this.target[1] + this.distance * Math.sin(this.pitch),
      this.target[2] + this.distance * cp * Math.cos(this.yaw),
    ];
  }

  view(): Float32Array<ArrayBuffer> {
    return lookAt(this.eye(), this.target);
  }

  projection(): Float32Array<ArrayBuffer> {
    return perspective(this.fovY, this.aspect, this.near, this.far);
  }

  viewProjection(): Float32Array<ArrayBuffer> {
    return mul4(this.projection(), this.view());
  }

  /** The ray through a screen point (CSS px), for picking. */
  ray(sx: number, sy: number): Ray {
    const { fwd, right, up } = this.basis(this);
    const t = Math.tan(this.fovY / 2);
    const nx = ((2 * sx) / this.viewW - 1) * t * this.aspect;
    const ny = (1 - (2 * sy) / this.viewH) * t;
    const dir = norm3([
      fwd[0] + right[0] * nx + up[0] * ny,
      fwd[1] + right[1] * nx + up[1] * ny,
      fwd[2] + right[2] * nx + up[2] * ny,
    ]);
    return { origin: this.eye(), dir };
  }

  /** Screen position (CSS px) of a world point, with its depth (< 0 = behind). */
  project(p: Vec3): [number, number, number] {
    const m = this.viewProjection();
    const x = m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!;
    const y = m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!;
    const w = m[3]! * p[0] + m[7]! * p[1] + m[11]! * p[2] + m[15]!;
    return [((x / w + 1) / 2) * this.viewW, ((1 - y / w) / 2) * this.viewH, w];
  }
}

function copy(s: OrbitState): OrbitState {
  return { yaw: s.yaw, pitch: s.pitch, distance: s.distance, target: [s.target[0], s.target[1], s.target[2]] };
}
