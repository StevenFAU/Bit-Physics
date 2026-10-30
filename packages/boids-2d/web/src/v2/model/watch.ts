// Swarm — Watch one (03-boids-2d.md § Tools: "follow a single fish; shows its
// neighbours and, in Eyes Only, its 1D retina strip"). Display only: nothing
// here feeds back into a step.
//
// A fish is known by its id, which rides along when the live ocean re-sorts
// its fish in memory (or by its slot, in the scenes that never re-sort). Each
// frame, after the steps, `track` finds the slot holding the watched id and
// copies that fish into a small record; `gather` then lists every fish within
// the watched fish's reach (its wrapped offset and velocity, up to MAX_LIST,
// and counts them all). The renderer draws the record straight from the GPU
// (render/watch.wgsl), so the highlight sits exactly on the drawn fish; the
// page reads the same record back for the camera and the panel. `pick` finds
// the fish nearest a point: the smallest distance as an f32 bit pattern by
// atomicMin, then the lowest slot at that distance.

import { readBuffer } from "@bp/gpu";
import { WGSL_BOID } from "./kernel.js";

/** Neighbours listed (all are counted). */
export const MAX_LIST = 256;
/** Record header, bytes; then MAX_LIST × vec4 (dx, dy, vx, vy). */
export const WATCH_HEADER = 64;
export const WATCH_BYTES = WATCH_HEADER + MAX_LIST * 16;
const NONE = 0xffffffff;

const WGSL_WATCH = `
${WGSL_BOID}
struct WP {
  want: u32, useIds: u32, n: u32, maxList: u32,
  halfW: f32, halfH: f32, radius: f32, pickR2: f32,
  px: f32, py: f32, _a: f32, _b: f32,
  rings: vec4<f32>,
};
struct Rec {
  found: u32, slot: u32, id: u32, count: atomic<u32>,
  pos: vec2<f32>, vel: vec2<f32>,
  align: f32, dens: f32, radius: f32, total: atomic<u32>,
  rings: vec4<f32>,
};
struct Watch { rec: Rec, list: array<vec4<f32>> };
@group(0) @binding(0) var<uniform> W: WP;
@group(0) @binding(1) var<storage, read> boids: array<Boid>;
@group(0) @binding(2) var<storage, read> ids: array<u32>;
@group(0) @binding(3) var<storage, read_write> out: Watch;
@group(0) @binding(4) var<storage, read_write> pick: array<atomic<u32>, 4>;
fn wrapD(d0: vec2<f32>) -> vec2<f32> {
  var d = d0; let w = W.halfW * 2.0; let h = W.halfH * 2.0;
  if (d.x >  W.halfW) { d.x = d.x - w; } if (d.x < -W.halfW) { d.x = d.x + w; }
  if (d.y >  W.halfH) { d.y = d.y - h; } if (d.y < -W.halfH) { d.y = d.y + h; }
  return d;
}
fn idOf(s: u32) -> u32 { return select(s, ids[s], W.useIds == 1u); }
@compute @workgroup_size(256)
fn track(@builtin(global_invocation_id) gid: vec3<u32>) {
  let s = gid.x; if (s >= W.n) { return; }
  if (idOf(s) != W.want) { return; }
  let b = boids[s];
  if (b.dens < 0.0) { return; }   // Food Chain: an empty slot (the fish died)
  out.rec.found = 1u; out.rec.slot = s; out.rec.id = W.want;
  out.rec.pos = b.pos; out.rec.vel = b.vel; out.rec.align = b.align; out.rec.dens = b.dens;
  out.rec.radius = W.radius; out.rec.rings = W.rings;
}
@compute @workgroup_size(256)
fn gather(@builtin(global_invocation_id) gid: vec3<u32>) {
  let s = gid.x; if (s >= W.n) { return; }
  if (out.rec.found == 0u || s == out.rec.slot) { return; }
  let b = boids[s];
  if (b.dens < 0.0) { return; }
  let d = wrapD(b.pos - out.rec.pos);
  if (dot(d, d) >= W.radius * W.radius) { return; }
  atomicAdd(&out.rec.total, 1u);
  let k = atomicAdd(&out.rec.count, 1u);
  if (k < W.maxList) { out.list[k] = vec4<f32>(d, b.vel); }
}
@compute @workgroup_size(256)
fn pickDist(@builtin(global_invocation_id) gid: vec3<u32>) {
  let s = gid.x; if (s >= W.n) { return; }
  let b = boids[s];
  if (b.dens < 0.0) { return; }
  let d = wrapD(b.pos - vec2<f32>(W.px, W.py));
  let d2 = dot(d, d);
  if (d2 <= W.pickR2) { atomicMin(&pick[0], bitcast<u32>(d2)); }
}
@compute @workgroup_size(256)
fn pickSlot(@builtin(global_invocation_id) gid: vec3<u32>) {
  let s = gid.x; if (s >= W.n) { return; }
  let b = boids[s];
  if (b.dens < 0.0) { return; }
  let d = wrapD(b.pos - vec2<f32>(W.px, W.py));
  if (bitcast<u32>(dot(d, d)) == atomicLoad(&pick[0])) { atomicMin(&pick[1], s); }
}
@compute @workgroup_size(1)
fn pickId() {
  let s = atomicLoad(&pick[1]);
  if (s != ${NONE}u) { atomicStore(&pick[2], idOf(s)); }
}
`;

export interface WatchRecord {
  found: boolean;
  slot: number;
  id: number;
  /** World position and the per-step velocity of the watched fish. */
  pos: [number, number];
  vel: [number, number];
  align: number;
  dens: number;
  radius: number;
  /** Fish within the radius (all of them; `list` holds the first MAX_LIST, in no fixed order). */
  total: number;
  list: Float32Array;
  listed: number;
}

export function readWatchRecord(ab: ArrayBuffer): WatchRecord {
  const u = new Uint32Array(ab, 0, WATCH_HEADER / 4);
  const f = new Float32Array(ab, 0, WATCH_HEADER / 4);
  const listed = Math.min(u[3]!, MAX_LIST);
  return {
    found: u[0] === 1,
    slot: u[1]!,
    id: u[2]!,
    pos: [f[4]!, f[5]!],
    vel: [f[6]!, f[7]!],
    align: f[8]!,
    dens: f[9]!,
    radius: f[10]!,
    total: u[11]!,
    list: new Float32Array(ab.slice(WATCH_HEADER, WATCH_HEADER + listed * 16)),
    listed,
  };
}

export interface WatchSource {
  boids: GPUBuffer;
  ids: GPUBuffer | null;
  n: number;
  halfW: number;
  halfH: number;
}

/** The tracker's pipelines and buffers (one per page). */
export class WatchTracker {
  readonly buffer: GPUBuffer;
  private readonly device: GPUDevice;
  private readonly layout: GPUBindGroupLayout;
  private readonly track: GPUComputePipeline;
  private readonly gatherP: GPUComputePipeline;
  private readonly pickDist: GPUComputePipeline;
  private readonly pickSlot: GPUComputePipeline;
  private readonly pickId: GPUComputePipeline;
  private readonly params: GPUBuffer;
  private readonly pickBuf: GPUBuffer;
  private readonly dummyIds: GPUBuffer;
  private readonly bgs = new Map<string, GPUBindGroup>();
  private readonly keys = new WeakMap<GPUBuffer, number>();
  private nextKey = 1;

  private constructor(device: GPUDevice, layout: GPUBindGroupLayout, p: GPUComputePipeline[]) {
    this.device = device;
    this.layout = layout;
    [this.track, this.gatherP, this.pickDist, this.pickSlot, this.pickId] = p as [
      GPUComputePipeline,
      GPUComputePipeline,
      GPUComputePipeline,
      GPUComputePipeline,
      GPUComputePipeline,
    ];
    const S = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    this.buffer = device.createBuffer({ size: WATCH_BYTES, usage: S, label: "swarm-watch" });
    this.params = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-watch-params" });
    this.pickBuf = device.createBuffer({ size: 16, usage: S, label: "swarm-watch-pick" });
    this.dummyIds = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE, label: "swarm-watch-no-ids" });
  }

  static async create(device: GPUDevice): Promise<WatchTracker> {
    const C = GPUShaderStage.COMPUTE;
    const layout = device.createBindGroupLayout({
      label: "swarm-watch",
      entries: [
        { binding: 0, visibility: C, buffer: { type: "uniform" } },
        { binding: 1, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: C, buffer: { type: "read-only-storage" } },
        { binding: 3, visibility: C, buffer: { type: "storage" } },
        { binding: 4, visibility: C, buffer: { type: "storage" } },
      ],
    });
    const module = device.createShaderModule({ code: WGSL_WATCH, label: "swarm-watch" });
    const info = await module.getCompilationInfo();
    const errs = info.messages.filter((m) => m.type === "error");
    if (errs.length) throw new Error(`watch shader: ${errs.map((e) => `${e.lineNum}:${e.message}`).join(" | ")}`);
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const mk = (e: string): Promise<GPUComputePipeline> => device.createComputePipelineAsync({ label: `swarm-watch-${e}`, layout: pl, compute: { module, entryPoint: e } });
    const p = await Promise.all(["track", "gather", "pickDist", "pickSlot", "pickId"].map(mk));
    return new WatchTracker(device, layout, p);
  }

  private key(b: GPUBuffer): number {
    let k = this.keys.get(b);
    if (k === undefined) {
      k = this.nextKey++;
      this.keys.set(b, k);
    }
    return k;
  }

  private bindGroup(src: WatchSource): GPUBindGroup {
    const ids = src.ids ?? this.dummyIds;
    const k = `${this.key(src.boids)}:${this.key(ids)}`;
    let bg = this.bgs.get(k);
    if (!bg) {
      if (this.bgs.size > 16) this.bgs.clear();
      bg = this.device.createBindGroup({
        layout: this.layout,
        label: "swarm-watch",
        entries: [
          { binding: 0, resource: { buffer: this.params } },
          { binding: 1, resource: { buffer: src.boids } },
          { binding: 2, resource: { buffer: ids } },
          { binding: 3, resource: { buffer: this.buffer } },
          { binding: 4, resource: { buffer: this.pickBuf } },
        ],
      });
      this.bgs.set(k, bg);
    }
    return bg;
  }

  private writeParams(src: WatchSource, target: number, radius: number, rings: [number, number, number, number], pick?: { x: number; y: number; r: number }): void {
    const ab = new ArrayBuffer(64);
    const u = new Uint32Array(ab);
    const f = new Float32Array(ab);
    u[0] = target >>> 0;
    u[1] = src.ids ? 1 : 0;
    u[2] = src.n;
    u[3] = MAX_LIST;
    f[4] = src.halfW;
    f[5] = src.halfH;
    f[6] = radius;
    f[7] = pick ? pick.r * pick.r : 0;
    f[8] = pick?.x ?? 0;
    f[9] = pick?.y ?? 0;
    f.set(rings, 12);
    this.device.queue.writeBuffer(this.params, 0, ab);
  }

  /** Record the watched fish and its neighbours within `radius` (world units) into `buffer`. */
  encode(enc: GPUCommandEncoder, src: WatchSource, id: number, radius: number, rings: [number, number, number, number] = [0, 0, 0, 0]): void {
    this.writeParams(src, id, radius, rings);
    enc.clearBuffer(this.buffer, 0, WATCH_HEADER);
    const pass = enc.beginComputePass({ label: "swarm-watch" });
    pass.setBindGroup(0, this.bindGroup(src));
    const g = Math.ceil(src.n / 256);
    pass.setPipeline(this.track);
    pass.dispatchWorkgroups(g);
    pass.setPipeline(this.gatherP);
    pass.dispatchWorkgroups(g);
    pass.end();
  }

  /** Clear the record (nothing watched: the renderer draws nothing). */
  clear(enc: GPUCommandEncoder): void {
    enc.clearBuffer(this.buffer, 0, WATCH_HEADER);
  }

  /** The fish nearest (x, y) within r (world units): its slot and id, or null. */
  async pick(src: WatchSource, x: number, y: number, r: number): Promise<{ slot: number; id: number } | null> {
    this.writeParams(src, NONE, 0, [0, 0, 0, 0], { x, y, r });
    this.device.queue.writeBuffer(this.pickBuf, 0, new Uint32Array([NONE, NONE, NONE, 0]));
    const enc = this.device.createCommandEncoder({ label: "swarm-pick" });
    const pass = enc.beginComputePass({ label: "swarm-pick" });
    pass.setBindGroup(0, this.bindGroup(src));
    const g = Math.ceil(src.n / 256);
    pass.setPipeline(this.pickDist);
    pass.dispatchWorkgroups(g);
    pass.setPipeline(this.pickSlot);
    pass.dispatchWorkgroups(g);
    pass.setPipeline(this.pickId);
    pass.dispatchWorkgroups(1);
    pass.end();
    this.device.queue.submit([enc.finish()]);
    const u = new Uint32Array(await readBuffer(this.device, this.pickBuf, 16));
    return u[1] === NONE ? null : { slot: u[1]!, id: u[2]! };
  }
}
