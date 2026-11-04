// View3D (00-foundation.md § 3.3–3.4, F3): the one per-frame uniform every 3D
// renderer reads — Environment, Points, Ribbons, Instances. It carries the
// world camera (for sky rays and the ground) and a model transform (a sim's
// own coordinates, e.g. Lorenz's z-up units, placed in the y-up world), so
// renderers take positions in the sim's coordinates and the sim never
// rewrites its buffers to suit the camera.
//
// Layout (WGSL `bp/view3d`, 384 bytes):
//   view_proj, inv_view_proj   world clip <-> world
//   model, mvp, mv             model -> world, model -> clip, model -> view
//   eye        xyz world eye,  w = time (s)
//   eye_model  xyz eye in model coordinates, w = model scale
//   viewport   (w px, h px, 1/w, 1/h) of the render target
//   proj       (P[0][0], P[1][1], near, far)

import type { OrbitCamera, Vec3 } from "./orbit-camera.js";
import { mul4 } from "./orbit-camera.js";

export const VIEW3D_BYTES = 384;

/** Depth format the F3 renderers use when a sim gives them a depth target. */
export const DEPTH_FORMAT: GPUTextureFormat = "depth24plus";

export function identity4(): Float32Array<ArrayBuffer> {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/**
 * A similarity transform (uniform scale, then a rotation given as the images
 * of the model's x, y and z axes, then a translation), column-major.
 */
export function similarity(scale: number, xAxis: Vec3, yAxis: Vec3, zAxis: Vec3, translate: Vec3 = [0, 0, 0]): Float32Array<ArrayBuffer> {
  const m = new Float32Array(16);
  m.set([
    xAxis[0] * scale, xAxis[1] * scale, xAxis[2] * scale, 0,
    yAxis[0] * scale, yAxis[1] * scale, yAxis[2] * scale, 0,
    zAxis[0] * scale, zAxis[1] * scale, zAxis[2] * scale, 0,
    translate[0], translate[1], translate[2], 1,
  ]);
  return m;
}

/** Column-major inverse of a general 4×4 (null when singular). */
export function invert4(m: Float32Array): Float32Array<ArrayBuffer> | null {
  const a = Array.from(m, Number);
  const inv = new Array<number>(16);
  inv[0] = a[5]! * a[10]! * a[15]! - a[5]! * a[11]! * a[14]! - a[9]! * a[6]! * a[15]! + a[9]! * a[7]! * a[14]! + a[13]! * a[6]! * a[11]! - a[13]! * a[7]! * a[10]!;
  inv[4] = -a[4]! * a[10]! * a[15]! + a[4]! * a[11]! * a[14]! + a[8]! * a[6]! * a[15]! - a[8]! * a[7]! * a[14]! - a[12]! * a[6]! * a[11]! + a[12]! * a[7]! * a[10]!;
  inv[8] = a[4]! * a[9]! * a[15]! - a[4]! * a[11]! * a[13]! - a[8]! * a[5]! * a[15]! + a[8]! * a[7]! * a[13]! + a[12]! * a[5]! * a[11]! - a[12]! * a[7]! * a[9]!;
  inv[12] = -a[4]! * a[9]! * a[14]! + a[4]! * a[10]! * a[13]! + a[8]! * a[5]! * a[14]! - a[8]! * a[6]! * a[13]! - a[12]! * a[5]! * a[10]! + a[12]! * a[6]! * a[9]!;
  inv[1] = -a[1]! * a[10]! * a[15]! + a[1]! * a[11]! * a[14]! + a[9]! * a[2]! * a[15]! - a[9]! * a[3]! * a[14]! - a[13]! * a[2]! * a[11]! + a[13]! * a[3]! * a[10]!;
  inv[5] = a[0]! * a[10]! * a[15]! - a[0]! * a[11]! * a[14]! - a[8]! * a[2]! * a[15]! + a[8]! * a[3]! * a[14]! + a[12]! * a[2]! * a[11]! - a[12]! * a[3]! * a[10]!;
  inv[9] = -a[0]! * a[9]! * a[15]! + a[0]! * a[11]! * a[13]! + a[8]! * a[1]! * a[15]! - a[8]! * a[3]! * a[13]! - a[12]! * a[1]! * a[11]! + a[12]! * a[3]! * a[9]!;
  inv[13] = a[0]! * a[9]! * a[14]! - a[0]! * a[10]! * a[13]! - a[8]! * a[1]! * a[14]! + a[8]! * a[2]! * a[13]! + a[12]! * a[1]! * a[10]! - a[12]! * a[2]! * a[9]!;
  inv[2] = a[1]! * a[6]! * a[15]! - a[1]! * a[7]! * a[14]! - a[5]! * a[2]! * a[15]! + a[5]! * a[3]! * a[14]! + a[13]! * a[2]! * a[7]! - a[13]! * a[3]! * a[6]!;
  inv[6] = -a[0]! * a[6]! * a[15]! + a[0]! * a[7]! * a[14]! + a[4]! * a[2]! * a[15]! - a[4]! * a[3]! * a[14]! - a[12]! * a[2]! * a[7]! + a[12]! * a[3]! * a[6]!;
  inv[10] = a[0]! * a[5]! * a[15]! - a[0]! * a[7]! * a[13]! - a[4]! * a[1]! * a[15]! + a[4]! * a[3]! * a[13]! + a[12]! * a[1]! * a[7]! - a[12]! * a[3]! * a[5]!;
  inv[14] = -a[0]! * a[5]! * a[14]! + a[0]! * a[6]! * a[13]! + a[4]! * a[1]! * a[14]! - a[4]! * a[2]! * a[13]! - a[12]! * a[1]! * a[6]! + a[12]! * a[2]! * a[5]!;
  inv[3] = -a[1]! * a[6]! * a[11]! + a[1]! * a[7]! * a[10]! + a[5]! * a[2]! * a[11]! - a[5]! * a[3]! * a[10]! - a[9]! * a[2]! * a[7]! + a[9]! * a[3]! * a[6]!;
  inv[7] = a[0]! * a[6]! * a[11]! - a[0]! * a[7]! * a[10]! - a[4]! * a[2]! * a[11]! + a[4]! * a[3]! * a[10]! + a[8]! * a[2]! * a[7]! - a[8]! * a[3]! * a[6]!;
  inv[11] = -a[0]! * a[5]! * a[11]! + a[0]! * a[7]! * a[9]! + a[4]! * a[1]! * a[11]! - a[4]! * a[3]! * a[9]! - a[8]! * a[1]! * a[7]! + a[8]! * a[3]! * a[5]!;
  inv[15] = a[0]! * a[5]! * a[10]! - a[0]! * a[6]! * a[9]! - a[4]! * a[1]! * a[10]! + a[4]! * a[2]! * a[9]! + a[8]! * a[1]! * a[6]! - a[8]! * a[2]! * a[5]!;
  const det = a[0]! * inv[0]! + a[1]! * inv[4]! + a[2]! * inv[8]! + a[3]! * inv[12]!;
  if (Math.abs(det) < 1e-30) return null;
  const out = new Float32Array(16);
  for (let i = 0; i < 16; i += 1) out[i] = inv[i]! / det;
  return out;
}

/** Apply a column-major 4×4 to a point; returns [x, y, z, w] (no divide). */
export function transform4(m: Float32Array, p: Vec3): [number, number, number, number] {
  return [
    m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
    m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
    m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
    m[3]! * p[0] + m[7]! * p[1] + m[11]! * p[2] + m[15]!,
  ];
}

export type Plane = [number, number, number, number];

/**
 * The six frustum planes of a clip matrix (Gribb–Hartmann, WebGPU depth
 * [0, 1]), normalised, inside where a·x + b·y + c·z + d ≥ 0. Order: left,
 * right, bottom, top, near, far. The same extraction runs in WGSL
 * (`bp/view3d` view3d_planes) for compute culling.
 */
export function frustumPlanes(m: Float32Array): Plane[] {
  const row = (r: number): [number, number, number, number] => [m[r]!, m[4 + r]!, m[8 + r]!, m[12 + r]!];
  const r0 = row(0);
  const r1 = row(1);
  const r2 = row(2);
  const r3 = row(3);
  const add = (a: number[], b: number[], s: number): Plane => [a[0]! + s * b[0]!, a[1]! + s * b[1]!, a[2]! + s * b[2]!, a[3]! + s * b[3]!];
  const planes: Plane[] = [add(r3, r0, 1), add(r3, r0, -1), add(r3, r1, 1), add(r3, r1, -1), [...r2] as Plane, add(r3, r2, -1)];
  return planes.map((p) => {
    const l = Math.hypot(p[0], p[1], p[2]) || 1;
    return [p[0] / l, p[1] / l, p[2] / l, p[3] / l];
  });
}

/** Does a sphere touch the frustum? (conservative: may keep a few near corners) */
export function sphereInFrustum(planes: readonly Plane[], c: Vec3, r: number): boolean {
  for (const p of planes) if (p[0] * c[0] + p[1] * c[1] + p[2] * c[2] + p[3] < -r) return false;
  return true;
}

/**
 * Projected radius in px of a sphere of radius r whose clip-space w is `w`
 * (the small-angle estimate the WGSL LOD pick uses): r · P[1][1] · h/2 / w.
 */
export function projectedRadiusPx(r: number, w: number, projYY: number, viewH: number): number {
  return w <= 1e-6 ? Infinity : (r * projYY * viewH * 0.5) / w;
}

/**
 * The per-frame view uniform. One buffer, written once per frame; every F3
 * renderer binds it at @group(0) @binding(0).
 */
export class View3D {
  readonly buffer: GPUBuffer;
  /** Model -> world (column-major); identity by default. */
  model: Float32Array<ArrayBuffer> = identity4();
  /** The model transform's uniform scale (sizes in model units -> world). */
  modelScale = 1;
  /** CPU copies of the last upload (picking, culling tests, callouts). */
  viewProj = identity4();
  mvp = identity4();
  mv = identity4();
  width = 1;
  height = 1;
  private readonly data = new Float32Array(VIEW3D_BYTES / 4);

  constructor(private readonly device: GPUDevice) {
    this.buffer = device.createBuffer({
      size: VIEW3D_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "view3d",
    });
  }

  /** Set the model transform (e.g. `similarity(…)`); takes effect at the next update. */
  setModel(m: Float32Array<ArrayBuffer>, scale: number): void {
    this.model = m;
    this.modelScale = scale;
  }

  /** Upload the camera for a target of `width`×`height` px. */
  update(camera: OrbitCamera, width: number, height: number, timeSec = performance.now() / 1000): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const view = camera.view();
    const proj = camera.projection();
    this.viewProj = mul4(proj, view);
    this.mvp = mul4(this.viewProj, this.model);
    this.mv = mul4(view, this.model);
    const inv = invert4(this.viewProj) ?? identity4();
    const eye = camera.eye();
    const invModel = invert4(this.model) ?? identity4();
    const em = transform4(invModel, eye);
    const d = this.data;
    d.set(this.viewProj, 0);
    d.set(inv, 16);
    d.set(this.model, 32);
    d.set(this.mvp, 48);
    d.set(this.mv, 64);
    d.set([eye[0], eye[1], eye[2], timeSec], 80);
    d.set([em[0], em[1], em[2], this.modelScale], 84);
    d.set([this.width, this.height, 1 / this.width, 1 / this.height], 88);
    d.set([proj[0]!, proj[5]!, camera.near, camera.far], 92);
    this.device.queue.writeBuffer(this.buffer, 0, d);
  }

  /** Screen position (px of the render target) of a model-space point; depth < 0 = behind. */
  project(p: Vec3): [number, number, number] {
    const [x, y, , w] = transform4(this.mvp, p);
    return [((x / w + 1) / 2) * this.width, ((1 - y / w) / 2) * this.height, w];
  }
}

/** A depth texture that follows a render target's size. */
export class DepthTarget {
  private tex: GPUTexture | null = null;
  private viewCache: GPUTextureView | null = null;
  width = 0;
  height = 0;

  constructor(
    private readonly device: GPUDevice,
    readonly format: GPUTextureFormat = DEPTH_FORMAT,
  ) {}

  ensure(width: number, height: number): GPUTextureView {
    if (!this.tex || this.width !== width || this.height !== height) {
      this.tex?.destroy();
      this.width = width;
      this.height = height;
      this.tex = this.device.createTexture({
        size: [width, height],
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        label: "f3-depth",
      });
      this.viewCache = this.tex.createView();
    }
    return this.viewCache!;
  }

  get view(): GPUTextureView {
    if (!this.viewCache) throw new Error("DepthTarget.ensure() must run first");
    return this.viewCache;
  }

  destroy(): void {
    this.tex?.destroy();
    this.tex = null;
    this.viewCache = null;
  }
}
