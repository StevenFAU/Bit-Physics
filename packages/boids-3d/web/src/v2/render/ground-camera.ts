// The watcher's camera (07-boids-3d.md, "The experience"): you stand in a
// reed bed and look up. The eye stays on the ground; a drag turns your head,
// the wheel or a pinch zooms like binoculars (the field of view, not the
// eye), double-click looks back at the flock. Left alone for a few seconds,
// the gaze eases after the flock's centre the way a watcher's head follows
// it — never under reduced motion. `dolly` walks the eye along the ground
// (scripted moves and the flicker check).
//
// It drives @bp/studio's CanvasInput through the same gesture surface as
// OrbitCamera (panBy, zoomAt, fling, stop, fit) and feeds View3D through
// view(), projection(), eye(), near and far. World is y up, as in @bp/render.

import type { Vec3 } from "@bp/render";
import { cross3, lookAt, norm3, perspective } from "@bp/render";

const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
/** Shortest signed angle from a to b. */
const angleDelta = (a: number, b: number): number => {
  const d = (b - a) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
};

export interface GroundView {
  eye: Vec3;
  yaw: number;
  pitch: number;
  /** Vertical field of view, radians. */
  fov: number;
}

export class GroundCamera {
  /** Rendered state. yaw 0 looks down −z; pitch lifts the gaze. */
  eyePos: Vec3 = [0, 1, 160];
  yaw = 0;
  pitch = 0.27;
  fovY = (50 * Math.PI) / 180;
  near = 0.25;
  far = 8000;
  viewW = 1;
  viewH = 1;
  minFov = (14 * Math.PI) / 180;
  maxFov = (75 * Math.PI) / 180;
  minPitch = -0.12;
  maxPitch = 1.35;
  /** Damping time constant, seconds. */
  damping = 0.12;
  /** Ease after `followTarget` once idle this long (s). */
  followDelay = 4;
  /** Follow time constant, seconds. */
  followDamping = 2.5;
  /** A world point the gaze eases after while idle (the flock's centre); null = hold. */
  followTarget: Vec3 | null = null;
  /** The follow aims this far above the target, in radians of pitch (frames the flock with sky below it). */
  followLift = 0.02;
  /** The follow never lowers the gaze below this pitch (radians). */
  followMinPitch = 0.2;
  reducedMotion = false;
  version = 0;

  private goal: GroundView = { eye: [0, 1, 160], yaw: 0, pitch: 0.27, fov: (50 * Math.PI) / 180 };
  private home: GroundView = { eye: [0, 1, 160], yaw: 0, pitch: 0.27, fov: (50 * Math.PI) / 180 };
  private vYaw = 0;
  private vPitch = 0;
  private lastInput = -Infinity;

  setViewport(w: number, h: number): void {
    if (w === this.viewW && h === this.viewH) return;
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
    this.version += 1;
  }

  get aspect(): number {
    return this.viewW / this.viewH;
  }

  get idle(): boolean {
    return performance.now() - this.lastInput > this.followDelay * 1000;
  }

  setHome(v: GroundView): void {
    this.home = copy(v);
    this.set(v);
  }

  set(v: GroundView): void {
    this.goal = this.clampView(copy(v));
    this.eyePos = [...this.goal.eye];
    this.yaw = this.goal.yaw;
    this.pitch = this.goal.pitch;
    this.fovY = this.goal.fov;
    this.vYaw = 0;
    this.vPitch = 0;
    this.version += 1;
  }

  state(): GroundView {
    return copy(this.goal);
  }

  /** Radians of gaze per CSS px: a drag keeps the sky under the pointer. */
  private get radPerPx(): number {
    return (2 * Math.tan(this.fovY / 2)) / this.viewH;
  }

  private touch(): void {
    this.lastInput = performance.now();
  }

  // ---- the CameraLike gesture surface (@bp/studio CanvasInput) ----------------

  /** A drag: turn the head (the sky moves with the pointer). */
  panBy(dxCss: number, dyCss: number): void {
    this.touch();
    const k = this.radPerPx;
    this.goal.yaw -= dxCss * k;
    this.goal.pitch += dyCss * k;
    this.goal = this.clampView(this.goal);
    if (this.reducedMotion) this.snap();
    this.version += 1;
  }

  /** Wheel / pinch: zoom the field of view (factor > 1 zooms in). */
  zoomAt(factor: number, _sx?: number, _sy?: number): void {
    this.touch();
    this.goal.fov = clamp(2 * Math.atan(Math.tan(this.goal.fov / 2) / factor), this.minFov, this.maxFov);
    if (this.reducedMotion) this.snap();
    this.version += 1;
  }

  fling(vxCss: number, vyCss: number): void {
    if (this.reducedMotion) return;
    const k = this.radPerPx;
    this.vYaw = -vxCss * k;
    this.vPitch = vyCss * k;
  }

  stop(): void {
    this.touch();
    this.vYaw = 0;
    this.vPitch = 0;
  }

  /** Double-click / "0": the home view; following resumes at once. */
  fit(_zoom = 1, _animate = false): void {
    this.goal = copy(this.home);
    this.vYaw = 0;
    this.vPitch = 0;
    this.lastInput = -Infinity;
    if (this.reducedMotion) this.snap();
    this.version += 1;
  }

  /** Walk the eye `d` world units along the ground, in the gaze's horizontal direction. */
  dolly(d: number): void {
    const f: Vec3 = [-Math.sin(this.goal.yaw), 0, -Math.cos(this.goal.yaw)];
    this.goal.eye = [this.goal.eye[0] + f[0] * d, this.goal.eye[1], this.goal.eye[2] + f[2] * d];
    this.eyePos = [...this.goal.eye];
    this.version += 1;
  }

  /** Advance damping, inertia and the follow. True while moving. */
  update(dtSec: number, now = performance.now()): boolean {
    const dt = Math.min(Math.max(dtSec, 0), 0.1);
    let moving = false;
    if (!this.reducedMotion && Math.abs(this.vYaw) + Math.abs(this.vPitch) > 1e-5) {
      this.goal.yaw += this.vYaw * dt;
      this.goal.pitch += this.vPitch * dt;
      const k = Math.exp(-dt / 0.35);
      this.vYaw *= k;
      this.vPitch *= k;
      this.goal = this.clampView(this.goal);
      moving = true;
    }
    if (this.followTarget && !this.reducedMotion && now - this.lastInput > this.followDelay * 1000) {
      const t = this.followTarget;
      const e = this.goal.eye;
      const dx = t[0] - e[0];
      const dy = t[1] - e[1];
      const dz = t[2] - e[2];
      const yaw = Math.atan2(-dx, -dz);
      // keep the horizon low in the frame: never look below `followMinPitch`
      const pitch = Math.max(Math.atan2(dy, Math.hypot(dx, dz)) + this.followLift, this.followMinPitch);
      const k = 1 - Math.exp(-dt / Math.max(this.followDamping, 1e-3));
      this.goal.yaw += angleDelta(this.goal.yaw, yaw) * k;
      this.goal.pitch += (pitch - this.goal.pitch) * k;
      this.goal = this.clampView(this.goal);
    }
    const a = this.reducedMotion ? 1 : 1 - Math.exp(-dt / Math.max(this.damping, 1e-4));
    const dy = angleDelta(this.yaw, this.goal.yaw);
    const dp = this.goal.pitch - this.pitch;
    const df = this.goal.fov - this.fovY;
    const de = [0, 1, 2].map((i) => this.goal.eye[i]! - this.eyePos[i]!);
    if (Math.abs(dy) + Math.abs(dp) + Math.abs(df) + Math.abs(de[0]!) + Math.abs(de[1]!) + Math.abs(de[2]!) > 1e-7) {
      this.yaw += dy * a;
      this.pitch += dp * a;
      this.fovY += df * a;
      this.eyePos = [this.eyePos[0] + de[0]! * a, this.eyePos[1] + de[1]! * a, this.eyePos[2] + de[2]! * a];
      moving = true;
    }
    if (moving) this.version += 1;
    return moving;
  }

  private snap(): void {
    this.eyePos = [...this.goal.eye];
    this.yaw = this.goal.yaw;
    this.pitch = this.goal.pitch;
    this.fovY = this.goal.fov;
  }

  private clampView(v: GroundView): GroundView {
    v.pitch = clamp(v.pitch, this.minPitch, this.maxPitch);
    v.fov = clamp(v.fov, this.minFov, this.maxFov);
    return v;
  }

  /** Unit gaze direction (rendered state). */
  forward(): Vec3 {
    const cp = Math.cos(this.pitch);
    return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
  }

  eye(): Vec3 {
    return [...this.eyePos];
  }

  view(): Float32Array<ArrayBuffer> {
    const f = this.forward();
    const e = this.eyePos;
    return lookAt(e, [e[0] + f[0], e[1] + f[1], e[2] + f[2]]);
  }

  projection(): Float32Array<ArrayBuffer> {
    return perspective(this.fovY, this.aspect, this.near, this.far);
  }

  /** The ray through a screen point (CSS px). */
  ray(sx: number, sy: number): { origin: Vec3; dir: Vec3 } {
    const fwd = this.forward();
    const right = norm3(cross3(fwd, [0, 1, 0]));
    const up = cross3(right, fwd);
    const t = Math.tan(this.fovY / 2);
    const nx = ((2 * sx) / this.viewW - 1) * t * this.aspect;
    const ny = (1 - (2 * sy) / this.viewH) * t;
    const dir = norm3([fwd[0] + right[0] * nx + up[0] * ny, fwd[1] + right[1] * nx + up[1] * ny, fwd[2] + right[2] * nx + up[2] * ny]);
    return { origin: this.eye(), dir };
  }
}

function copy(v: GroundView): GroundView {
  return { eye: [v.eye[0], v.eye[1], v.eye[2]], yaw: v.yaw, pitch: v.pitch, fov: v.fov };
}
