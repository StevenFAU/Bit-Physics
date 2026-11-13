// Chaos's renderer (05-strange-attractors.md, "The look"): long-exposure
// astrophotography of the Lorenz attractor, on the shared 3D layer (F3).
//
//   backdrop     Environment, a dark studio gradient (no starfield)
//   attractor    the density population, splatted into an exponential moving
//                average (Accumulator "ema"): magnesium white where the flow is
//                fast, cobalt where it is slow
//   the ball     the released ensemble, crisp, velocity-stretched, coloured by
//                where each member started inside the ball (along the
//                direction it is stretched most) so folds show as bands; drawn
//                into its own frame target (thousands of overlapping splats
//                stay precise in rgba16float), depth-tested
//   ribbons      a few ensemble members' recent paths (GPU-fed) and the Ghost
//                pair (CPU f64-fed), fading with age and depth
//   fixed points the origin and C±, small lit spheres (Instances)
//
// Model coordinates are Lorenz's own (z up); View3D's model transform puts the
// attractor, centred and scaled, into the y-up world the OrbitCamera orbits.

import type { GpuProfiler } from "@bp/gpu";
import type { HdrPipeline, OrbitCamera, PointDraw, Rgb, Vec3 } from "@bp/render";
import {
  Accumulator,
  DEPTH_FORMAT,
  DepthTarget,
  Environment,
  INSTANCE_FLOATS,
  Instances,
  Points,
  Ribbons,
  STUDIO_DARK,
  View3D,
  icosphere,
  paletteTexture,
  sampleColormap,
  similarity,
  srgbToLinear,
  transform4,
} from "@bp/render";
import type { V3 } from "../model/lorenz.js";
import { TRACK } from "../model/ensemble.js";

/** Density palette: cobalt (slow) to magnesium white (fast), sRGB stops. */
export const DENSITY_STOPS: readonly Rgb[] = [
  [0.05, 0.12, 0.42],
  [0.16, 0.34, 0.86],
  [0.55, 0.7, 1.0],
  [0.97, 0.98, 1.0],
];

/** The ball's palette: where a member started along the stretching direction. */
export const BALL_STOPS: readonly Rgb[] = [
  [1.0, 0.86, 0.42],
  [1.0, 0.55, 0.28],
  [0.96, 0.3, 0.46],
  [0.72, 0.3, 0.92],
  [0.4, 0.62, 1.0],
];

export interface ChaosLook {
  /** Total light of the density population (px · radiance). */
  densityLight: number;
  /** Total light of the ensemble. */
  ballLight: number;
  /** Long exposure, seconds (the camera moving shortens it to `tauMoving`). */
  tau: number;
  tauMoving: number;
  /** Velocity stretch of the ball, 0–1. */
  stretch: number;
  showFixedPoints: boolean;
  showTracks: boolean;
}

export const DEFAULT_LOOK: ChaosLook = {
  densityLight: 1.2e5,
  ballLight: 1.6e5,
  tau: 0.2,
  tauMoving: 0.04,
  stretch: 0.85,
  showFixedPoints: true,
  showTracks: true,
};

export interface FrameState {
  camera: OrbitCamera;
  dtSec: number;
  cameraMoving: boolean;
  density: { state: GPUBuffer; prev: GPUBuffer; n: number };
  ensemble: { state: GPUBuffer; prev: GPUBuffer; n: number } | null;
  /** How many members to draw (overlap normalisation), ≤ ensemble.n. */
  drawCount: number;
  /** The ball's estimated footprint, px² (caps its light per pixel). */
  ballArea: number;
  origin: V3;
  prevOrigin: V3;
  /** Steps taken this frame (0: no motion to stretch along). */
  steps: number;
  compare: { state: GPUBuffer; n: number; origin: V3 } | null;
}

const lin = (c: Rgb): [number, number, number] => [srgbToLinear(c[0]), srgbToLinear(c[1]), srgbToLinear(c[2])];

export class ChaosView {
  look: ChaosLook = { ...DEFAULT_LOOK };
  readonly view3d: View3D;
  readonly depth: DepthTarget;
  private centre: V3 = [0, 0, 23.5];
  private scale = 1 / 22;
  private goalCentre: V3 = [0, 0, 23.5];
  private goalScale = 1 / 22;

  private constructor(
    device: GPUDevice,
    view3d: View3D,
    readonly env: Environment,
    private readonly exposure: Accumulator,
    private readonly ballLight: Accumulator,
    private readonly densityDraw: PointDraw,
    private readonly ballDraw: PointDraw,
    private readonly compareDraw: PointDraw,
    readonly tracks: Ribbons,
    readonly ghost: Ribbons,
    readonly markers: Instances,
    private readonly densityLut: GPUTextureView,
    private readonly ballLut: GPUTextureView,
  ) {
    this.view3d = view3d;
    this.depth = new DepthTarget(device, DEPTH_FORMAT);
    this.applyModel();
  }

  static async create(device: GPUDevice): Promise<ChaosView> {
    const view3d = new View3D(device);
    const [env, exposure, ballLight, densityPts, ballPts, tracks, ghost, markers] = await Promise.all([
      Environment.create(device, view3d, { ...STUDIO_DARK, glow: 0.5, glowRadius: 0.5 }, { depthFormat: DEPTH_FORMAT }),
      Accumulator.create(device, { mode: "ema", depthFormat: DEPTH_FORMAT }),
      Accumulator.create(device, { mode: "frame", depthFormat: DEPTH_FORMAT }),
      Points.create(device, view3d, { label: "density-points" }),
      Points.create(device, view3d, { label: "ball-points", depthFormat: DEPTH_FORMAT }),
      Ribbons.create(device, view3d, { strands: TRACK, slots: 384, label: "tracks", depthFormat: DEPTH_FORMAT }),
      Ribbons.create(device, view3d, { strands: 2, slots: 1600, label: "ghost", depthFormat: DEPTH_FORMAT }),
      Instances.create(device, view3d, {
        lods: [icosphere(3), icosphere(2), icosphere(1)],
        lodPx: [20, 7],
        capacity: 8,
        label: "fixed-points",
        depthFormat: DEPTH_FORMAT,
      }),
    ]);
    const densityLut = paletteTexture(device, DENSITY_STOPS, "density-palette").createView();
    const ballLut = paletteTexture(device, BALL_STOPS, "ball-palette").createView();
    return new ChaosView(
      device,
      view3d,
      env,
      exposure,
      ballLight,
      densityPts.createDraw("density"),
      ballPts.createDraw("ball"),
      ballPts.createDraw("compare"),
      tracks,
      ghost,
      markers,
      densityLut,
      ballLut,
    );
  }

  /** Frame the attractor: its centre and RMS size (model units). */
  frame(centre: V3, rms: number, snap = false): void {
    this.goalCentre = [...centre];
    this.goalScale = 1 / Math.max(2.4 * rms, 1e-3);
    if (snap) {
      this.centre = [...centre];
      this.scale = this.goalScale;
      this.applyModel();
    }
  }

  private applyModel(): void {
    const s = this.scale;
    const c = this.centre;
    // Lorenz x → world x, y → world −z, z → world y (a proper rotation), centred
    const m = similarity(s, [1, 0, 0], [0, 0, -1], [0, 1, 0], [-c[0] * s, -c[2] * s, c[1] * s]);
    this.view3d.setModel(m, s);
  }

  /** Ensemble member colours for the tracked ribbons (attributes → ball palette). */
  setTrackColors(attrs: readonly number[]): void {
    const rgbi = new Float32Array(TRACK * 4);
    for (let i = 0; i < TRACK; i += 1) {
      const c = lin(sampleColormap({ stops: BALL_STOPS }, attrs[i] ?? 0.5));
      rgbi.set([c[0], c[1], c[2], 0.14], i * 4);
    }
    this.tracks.setColors(rgbi);
  }

  /** The fixed points as small spheres (model coordinates). */
  setFixedPoints(points: readonly V3[]): void {
    const rec = new Float32Array(points.length * INSTANCE_FLOATS);
    points.forEach((p, i) => {
      const origin = i === 0;
      rec.set([p[0], p[1], p[2], origin ? 0.45 : 0.55, 0, 0, 0, 1, 0.05, 0.06, 0.09, origin ? 0.02 : 0.05], i * INSTANCE_FLOATS);
    });
    this.markers.set(rec, points.length);
  }

  /** World position of a model point (the camera's coordinates). */
  toWorld(p: V3): Vec3 {
    const [x, y, z] = transform4(this.view3d.model, p);
    return [x, y, z];
  }

  /** Model units per CSS px at the view centre (picking tolerances). */
  unitsPerPx(camera: OrbitCamera): number {
    const worldPerPx = (2 * camera.distance * Math.tan(camera.fovY / 2)) / Math.max(camera.viewH, 1);
    return worldPerPx / this.scale;
  }

  /** Model-space ray through a CSS-px screen point. */
  modelRay(camera: OrbitCamera, sx: number, sy: number): { origin: V3; dir: V3 } {
    const r = camera.ray(sx, sy);
    // world → model: undo the translation, rotation (transpose) and scale
    const s = this.scale;
    const c = this.centre;
    const toModel = (p: Vec3, point: boolean): V3 => {
      const q: Vec3 = point ? [p[0] + c[0] * s, p[1] + c[2] * s, p[2] - c[1] * s] : p;
      // rotation columns: x→(1,0,0), y→(0,0,−1), z→(0,1,0); inverse = transpose
      return [q[0] / s, -q[2] / s, q[1] / s];
    };
    const d = toModel(r.dir, false);
    const l = Math.hypot(...d) || 1;
    return { origin: toModel(r.origin, true), dir: [d[0] / l, d[1] / l, d[2] / l] };
  }

  encode(enc: GPUCommandEncoder, hdr: HdrPipeline, f: FrameState, profiler?: GpuProfiler | null): void {
    // ease the framing towards its goal (a changed ρ moves the attractor)
    const k = 1 - Math.exp(-f.dtSec / 0.35);
    let moved = false;
    for (let i = 0; i < 3; i += 1) {
      const d = this.goalCentre[i]! - this.centre[i]!;
      if (Math.abs(d) > 1e-4) {
        this.centre[i] = this.centre[i]! + d * k;
        moved = true;
      }
    }
    if (Math.abs(this.goalScale - this.scale) > 1e-7) {
      this.scale += (this.goalScale - this.scale) * k;
      moved = true;
    }
    if (moved) this.applyModel();

    const w = hdr.width;
    const h = hdr.height;
    this.view3d.update(f.camera, w, h);
    const depth = this.depth.ensure(w, h);
    this.exposure.resize(w, h);
    this.ballLight.resize(w, h);
    const L = this.look;
    // sizes scale with the render target, so a governor step-down keeps the look
    const pxScale = Math.max(0.5, h / 900);

    if (L.showFixedPoints) this.markers.encodeCull(enc, profiler?.pass("cull") ?? undefined);

    // 1. backdrop + fixed points (writes depth)
    const a = enc.beginRenderPass({
      label: "chaos-backdrop",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      depthStencilAttachment: { view: depth, depthLoadOp: "clear", depthStoreOp: "store", depthClearValue: 1 },
      timestampWrites: profiler?.pass("backdrop") ?? undefined,
    });
    this.env.draw(a);
    if (L.showFixedPoints) this.markers.draw(a);
    a.end();

    // 2. the attractor's long exposure
    this.densityDraw.set(
      { positions: f.density.state, previous: f.density.prev, count: f.density.n },
      {
        energy: L.densityLight / f.density.n,
        lut: this.densityLut,
        lutGain: 1,
        radius: 0.05,
        minPx: 1.1 * pxScale,
        maxPx: 3 * pxScale,
        stretch: f.steps > 0 ? 0.5 : 0,
      },
    );
    const tau = f.cameraMoving ? L.tauMoving : L.tau;
    const decay = Math.exp(-Math.min(f.dtSec, 0.1) / Math.max(tau, 1e-3));
    const pd = this.exposure.begin(enc, { timestampWrites: profiler?.pass("density") ?? undefined });
    this.densityDraw.draw(pd);
    this.exposure.end(enc, pd, decay);

    // 3. the ball (and the save point's ball, when comparing)
    const pe = this.ballLight.begin(enc, { depth, timestampWrites: profiler?.pass("ball") ?? undefined });
    if (f.ensemble && f.drawCount > 0) {
      this.ballDraw.set(
        { positions: f.ensemble.state, previous: f.ensemble.prev, count: f.drawCount },
        {
          origin: f.origin,
          prevOrigin: f.prevOrigin,
          stretch: f.steps > 0 ? L.stretch : 0,
          // a collapsed ball keeps its light to ≤ ~1500 per pixel (rgba16float tops out at 65504)
          energy: Math.min(L.ballLight, 1500 * f.ballArea) / f.drawCount,
          lut: this.ballLut,
          lutGain: 1,
          radius: 0.08,
          minPx: 1.2 * pxScale,
          maxPx: 4 * pxScale,
        },
      );
      this.ballDraw.draw(pe);
    }
    if (f.compare) {
      const n = Math.min(f.compare.n, f.drawCount || f.compare.n);
      this.compareDraw.set(
        { positions: f.compare.state, count: n },
        { origin: f.compare.origin, energy: Math.min(L.ballLight * 0.6, 1500 * f.ballArea) / n, color: [0.35, 0.85, 0.95], radius: 0.08, minPx: 1.2 * pxScale, maxPx: 4 * pxScale },
      );
      this.compareDraw.draw(pe);
    }
    this.ballLight.end(enc, pe);

    // 4. composite + ribbons
    const b = enc.beginRenderPass({
      label: "chaos-light",
      colorAttachments: [{ view: hdr.sceneView, loadOp: "load", storeOp: "store" }],
      depthStencilAttachment: { view: depth, depthReadOnly: true },
      timestampWrites: profiler?.pass("light") ?? undefined,
    });
    this.exposure.composite(b, 1);
    this.ballLight.composite(b, 1);
    this.tracks.look = { ...this.tracks.look, width: 1.3 * pxScale, fade: 1.2, depthNear: 2, depthFar: 5, depthMin: 0.45, energy: 1 };
    this.ghost.look = { ...this.ghost.look, width: 1.8 * pxScale, fade: 0.8, depthNear: 2, depthFar: 5, depthMin: 0.5, energy: 1 };
    if (L.showTracks && f.ensemble) this.tracks.draw(b);
    this.ghost.draw(b);
    b.end();
  }

  /** How many fixed points the GPU cull kept at each level of detail (tests). */
  async readMarkerCounts(device: GPUDevice): Promise<number[]> {
    const staging = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "marker-counts" });
    const enc = device.createCommandEncoder();
    this.markers.copyCounts(enc, staging);
    device.queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const out = Array.from(new Uint32Array(staging.getMappedRange().slice(0)));
    staging.destroy();
    return out.slice(0, this.markers.levels);
  }

  /** Forget the long exposure (scene change, restore). */
  clearExposure(): void {
    this.exposure.clear();
  }
}
