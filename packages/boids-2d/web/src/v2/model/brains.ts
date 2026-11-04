// Swarm — the M1 brains (03-boids-2d.md § The model, "Brains (one kernel
// interface)"): the Vicsek model for The Order Dial and Couzin's zones for
// The Mill. NEW kernels, not part of the gated v4 kernel (./kernel.ts, which
// stays byte for byte as it was and keeps running Open Water and the proofs).
//
// They keep the v4 kernel's determinism design:
//   * every neighbour sum is an i32 in fixed point, so the order neighbours
//     are visited in cannot change a bit — brute force ≡ counting sort, and a
//     run replays byte for byte on the same GPU;
//   * the noise is a counter hash of (seed, step, fish id). The id rides
//     along when the live ocean re-sorts its fish in memory, so — unlike the
//     v4 kernel, whose noise follows the memory slot — a re-sort changes no
//     fish's path even with noise on.
// Both write the v4 Boid layout (pos, vel, align, dens), so the renderer, the
// exact order-parameter reduction and the checkpoints work unchanged.

import type { SpeciesParams, VisionBrainParams } from "./brains-m3.js";
import { WGSL_BOID } from "./kernel.js";

export type Brain = "reynolds" | "vicsek" | "couzin" | "species" | "vision";

/** The Vicsek model (Vicsek et al. 1995), in the page's units. */
export interface VicsekParams {
  /** Interaction radius r, world units. */
  r: number;
  /** Speed v₀ per step, world units. */
  speed: number;
  /** Noise η ∈ [0, 1]: each step a heading turns by a uniform angle in [−ηπ, ηπ] (η = 1 is fully random). */
  eta: number;
}

/** Couzin et al. 2002's zones, in the page's units. */
export interface CouzinParams {
  /** Zone of repulsion radius r_r. */
  rr: number;
  /** Zone of orientation outer radius r_o (Δr_o = r_o − r_r). */
  ro: number;
  /** Zone of attraction outer radius r_a (Δr_a = r_a − r_o). */
  ra: number;
  /** Field of perception α, degrees (the blind angle behind is 360 − α). */
  fovDeg: number;
  /** Maximum turn per step θ·τ, radians. */
  maxTurn: number;
  /** Speed s·τ per step, world units. */
  speed: number;
  /** Heading noise σ, radians (a Gaussian draw per step). */
  sigma: number;
}

export type BrainParams =
  | { kind: "vicsek"; p: VicsekParams }
  | { kind: "couzin"; p: CouzinParams }
  // M3 (./brains-m3.ts): the species matrix and Eyes Only's vision model
  | { kind: "species"; p: SpeciesParams }
  | { kind: "vision"; p: VisionBrainParams };

/** The largest interaction radius: the counting sort's cells must be at least this wide. */
export const reach = (b: BrainParams): number =>
  b.kind === "vicsek" ? b.p.r : b.kind === "couzin" ? b.p.ra : b.kind === "species" ? b.p.rCoh : b.p.range;

/** Brain uniform: 24 words (96 bytes). */
export const BRAIN_FLOATS = 24;
export const BRAIN_BYTES = BRAIN_FLOATS * 4;

/** A 32-bit integer hash (Wellons' lowbias32), the same in JS and WGSL. */
export function hashU32(a: number): number {
  let x = a >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

/** The per-step noise seed: a hash of (seed, step), so no two (seed, step) pairs share draws. */
export const brainSeed = (seed: number, step: number): number => hashU32((hashU32(seed >>> 0) ^ Math.imul(step >>> 0, 0x9e3779b1)) >>> 0);

export interface BrainInputs {
  brain: BrainParams;
  halfW: number;
  halfH: number;
  cols: number;
  rows: number;
  cellX: number;
  cellY: number;
  seed: number;
  step: number;
  n: number;
  /** The shark (Couzin only): world x, y, radius, strength (0 = absent). */
  fear: { x: number; y: number; radius: number; strength: number } | null;
}

/** Fill the brain uniform. f32 fields go through a Float32Array view, u32 fields through a Uint32Array view. */
export function writeBrainParams(buf: ArrayBuffer, byteOffset: number, o: BrainInputs): void {
  const f = new Float32Array(buf, byteOffset, BRAIN_FLOATS);
  const u = new Uint32Array(buf, byteOffset, BRAIN_FLOATS);
  f.fill(0);
  f[0] = o.halfW;
  f[1] = o.halfH;
  f[2] = o.cols;
  f[3] = o.rows;
  f[4] = o.cellX;
  f[5] = o.cellY;
  if (o.brain.kind === "vicsek") {
    const p = o.brain.p;
    f[6] = p.speed;
    f[7] = p.eta;
    f[8] = p.r * p.r;
  } else if (o.brain.kind === "couzin") {
    const p = o.brain.p;
    f[6] = p.speed;
    f[7] = p.sigma;
    f[8] = p.rr * p.rr;
    f[9] = p.ro * p.ro;
    f[10] = p.ra * p.ra;
    f[11] = p.fovDeg >= 359.5 ? -2 : Math.cos((p.fovDeg * Math.PI) / 360);
    f[12] = p.maxTurn;
  }
  u[14] = brainSeed(o.seed, o.step);
  u[15] = o.n >>> 0;
  if (o.fear && o.fear.strength > 0) {
    f[16] = o.fear.x;
    f[17] = o.fear.y;
    f[18] = o.fear.radius;
    f[19] = o.fear.strength;
  }
}

const WGSL_BRAIN_COMMON = `
${WGSL_BOID}
struct BP {
  halfW: f32, halfH: f32, gridCols: f32, gridRows: f32,
  cellX: f32, cellY: f32, speed: f32, eta: f32,       // vicsek: v0, eta | couzin: s, sigma
  r0sq: f32, r1sq: f32, r2sq: f32, fovCos: f32,       // vicsek: r^2 | couzin: rr^2, ro^2, ra^2, cos(alpha/2)
  maxTurn: f32, _a: f32, frameSeed: u32, n: u32,
  fearX: f32, fearY: f32, fearR: f32, fearStr: f32,
  _b: vec4<f32>,
};
@group(0) @binding(0) var<uniform> B: BP;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> outB: array<Boid>;
@group(0) @binding(3) var<storage, read> ids: array<u32>;
@group(0) @binding(4) var<storage, read_write> diag: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read> cellStart: array<u32>;
@group(0) @binding(6) var<storage, read> order: array<u32>;
@group(0) @binding(7) var<storage, read_write> keys: array<u32>;
const PI: f32 = 3.14159265;
fn fin(x: f32) -> f32 { let z = x * 0.0; return select(x, 0.0, z != 0.0); }
fn fin2(p: vec2<f32>) -> vec2<f32> { return vec2<f32>(fin(p.x), fin(p.y)); }
fn wrapD(d0: vec2<f32>) -> vec2<f32> {
  var d = d0; let w = B.halfW * 2.0; let h = B.halfH * 2.0;
  if (d.x >  B.halfW) { d.x = d.x - w; } if (d.x < -B.halfW) { d.x = d.x + w; }
  if (d.y >  B.halfH) { d.y = d.y - h; } if (d.y < -B.halfH) { d.y = d.y + h; }
  return d;
}
fn wrapP(p0: vec2<f32>) -> vec2<f32> {
  var p = p0;
  if (p.x >  B.halfW) { p.x = p.x - B.halfW * 2.0; } if (p.x < -B.halfW) { p.x = p.x + B.halfW * 2.0; }
  if (p.y >  B.halfH) { p.y = p.y - B.halfH * 2.0; } if (p.y < -B.halfH) { p.y = p.y + B.halfH * 2.0; }
  return p;
}
fn hashU(a: u32) -> u32 { var x = a; x = x ^ (x >> 16u); x = x * 0x7feb352du; x = x ^ (x >> 15u); x = x * 0x846ca68bu; x = x ^ (x >> 16u); return x; }
// uniform in [0, 1) from (fish id, step seed, draw k): 24 bits
fn rnd(id: u32, k: u32) -> f32 { return f32(hashU((id * 0x9e3779b1u) ^ hashU(B.frameSeed + k * 0x68e31da4u)) >> 8u) / 16777216.0; }
fn unitOf(v: vec2<f32>, fallback: vec2<f32>) -> vec2<f32> { let l = length(v); return select(fallback, v / l, l > 1e-12); }
fn rot(v: vec2<f32>, a: f32) -> vec2<f32> { let c = cos(a); let s = sin(a); return vec2<f32>(v.x * c - v.y * s, v.x * s + v.y * c); }
fn cellXY(p: vec2<f32>) -> vec2<i32> {
  return vec2<i32>(i32(clamp(floor((p.x + B.halfW) / B.cellX), 0.0, B.gridCols - 1.0)),
                   i32(clamp(floor((p.y + B.halfH) / B.cellY), 0.0, B.gridRows - 1.0)));
}
@compute @workgroup_size(256)
fn brainKeys(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); if (i >= n) { return; }
  let c = cellXY(inB[i].pos);
  keys[i] = u32(c.y) * u32(B.gridCols) + u32(c.x);
}
`;

/**
 * The neighbour walk, shared by every brain: the counting sort's 3×3 wrapped
 * block of cells (sort) or every fish (brute). ACCUM is the brain's body for
 * one neighbour j ≠ i, with d = the wrapped offset to j and d2 = |d|².
 */
export function walkers(name: string, state: string, accum: string, integrate: string): string {
  return `
@compute @workgroup_size(256)
fn ${name}Sort(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); if (i >= n) { return; }
  let me = inB[i]; let p = me.pos;
  let h = unitOf(me.vel, vec2<f32>(1.0, 0.0));
${state}
  let cols = i32(B.gridCols); let rows = i32(B.gridRows);
  let g = cellXY(p);
  for (var oy = -1; oy <= 1; oy = oy + 1) {
    var yy = g.y + oy;
    if (rows >= 3) { if (yy < 0) { yy = yy + rows; } else if (yy >= rows) { yy = yy - rows; } } else { if (yy < 0 || yy >= rows) { continue; } }
    for (var ox = -1; ox <= 1; ox = ox + 1) {
      var xx = g.x + ox;
      if (cols >= 3) { if (xx < 0) { xx = xx + cols; } else if (xx >= cols) { xx = xx - cols; } } else { if (xx < 0 || xx >= cols) { continue; } }
      let c = u32(yy * cols + xx);
      let end = cellStart[c + 1u];
      for (var s = cellStart[c]; s < end; s = s + 1u) {
        let j = order[s];
        if (j == i) { continue; }
        let d = wrapD(inB[j].pos - p);
        let d2 = dot(d, d);
${accum}
      }
    }
  }
${integrate}
}
@compute @workgroup_size(64)
fn ${name}Brute(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); if (i >= n) { return; }
  let me = inB[i]; let p = me.pos;
  let h = unitOf(me.vel, vec2<f32>(1.0, 0.0));
${state}
  for (var j: u32 = 0u; j < n; j = j + 1u) {
    if (j == i) { continue; }
    let d = wrapD(inB[j].pos - p);
    let d2 = dot(d, d);
${accum}
  }
${integrate}
}`;
}

// ---- Vicsek: align with the mean heading within r (self included), constant speed, angular noise ----
// Headings are summed as i32 units of 2^-20 (|sum| < 2^31 up to 2047 neighbours; flagged above 2000).
const VICSEK_STATE = `
  var sx: i32 = i32(round(h.x * 1048576.0));
  var sy: i32 = i32(round(h.y * 1048576.0));
  var nn: u32 = 0u;`;
const VICSEK_ACCUM = `
        if (d2 < B.r0sq) {
          let u = unitOf(inB[j].vel, vec2<f32>(1.0, 0.0));
          sx = sx + i32(round(u.x * 1048576.0));
          sy = sy + i32(round(u.y * 1048576.0));
          nn = nn + 1u;
        }`;
const VICSEK_INTEGRATE = `
  if (nn > 2000u) { atomicOr(&diag[0], 1u); }
  var dir = h;
  if (sx != 0 || sy != 0) { dir = normalize(vec2<f32>(f32(sx), f32(sy))); }
  // local order: |mean heading| of the neighbourhood (kept in align, as v4 keeps its local alignment)
  let local = length(vec2<f32>(f32(sx), f32(sy))) / (1048576.0 * f32(nn + 1u));
  if (B.eta > 0.0) { dir = rot(dir, (rnd(ids[i], 0u) * 2.0 - 1.0) * B.eta * PI); }
  let v = dir * B.speed;
  outB[i].pos = fin2(wrapP(p + v));
  outB[i].vel = fin2(v);
  outB[i].align = local;
  outB[i].dens = clamp(f32(nn) / 30.0, 0.0, 1.0);`;

// ---- Couzin zones: repulsion first; else orientation + attraction; blind angle; capped turn ----
// Unit vectors are summed as i32 units of 2^-16 (room for 32,767 neighbours per zone).
const COUZIN_STATE = `
  var rx: i32 = 0; var ry: i32 = 0; var nr: u32 = 0u;
  var ox_: i32 = 0; var oy_: i32 = 0; var no: u32 = 0u;
  var ax: i32 = 0; var ay: i32 = 0; var na: u32 = 0u;`;
const COUZIN_ACCUM = `
        if (d2 < B.r2sq && d2 > 1e-12) {
          let dist = sqrt(d2);
          let u = d / dist;
          if (dot(u, h) >= B.fovCos) {
            if (d2 < B.r0sq) {
              rx = rx - i32(round(u.x * 65536.0)); ry = ry - i32(round(u.y * 65536.0)); nr = nr + 1u;
            } else if (d2 < B.r1sq) {
              let w = unitOf(inB[j].vel, vec2<f32>(1.0, 0.0));
              ox_ = ox_ + i32(round(w.x * 65536.0)); oy_ = oy_ + i32(round(w.y * 65536.0)); no = no + 1u;
            } else {
              ax = ax + i32(round(u.x * 65536.0)); ay = ay + i32(round(u.y * 65536.0)); na = na + 1u;
            }
          }
        }`;
const COUZIN_INTEGRATE = `
  if (nr > 30000u || no > 30000u || na > 30000u) { atomicOr(&diag[0], 1u); }
  let R = vec2<f32>(f32(rx), f32(ry));
  let O = vec2<f32>(f32(ox_), f32(oy_));
  let A = vec2<f32>(f32(ax), f32(ay));
  var des = h;
  if (nr > 0u) {
    des = unitOf(R, h);
  } else if (no > 0u && na > 0u) {
    des = unitOf(0.5 * (unitOf(O, h) + unitOf(A, h)), h);
  } else if (no > 0u) {
    des = unitOf(O, h);
  } else if (na > 0u) {
    des = unitOf(A, h);
  }
  // the shark: inside its ring, fleeing comes first
  if (B.fearStr > 0.0) {
    let fd = wrapD(p - vec2<f32>(B.fearX, B.fearY));
    let fl = length(fd);
    if (fl < B.fearR && fl > 1e-6) {
      let w = B.fearStr * (1.0 - fl / B.fearR);
      des = unitOf(des * (1.0 - min(w, 1.0)) + (fd / fl) * min(w, 1.0) * 4.0, h);
    }
  }
  // Gaussian heading noise (Box-Muller from two 24-bit draws)
  if (B.eta > 0.0) {
    let u1 = max(rnd(ids[i], 0u), 1e-7);
    let u2 = rnd(ids[i], 1u);
    des = rot(des, sqrt(-2.0 * log(u1)) * cos(2.0 * PI * u2) * B.eta);
  }
  // turn towards the desired heading by at most maxTurn
  let ang = atan2(h.x * des.y - h.y * des.x, dot(h, des));
  let nh = rot(h, clamp(ang, -B.maxTurn, B.maxTurn));
  let v = nh * B.speed;
  outB[i].pos = fin2(wrapP(p + v));
  outB[i].vel = fin2(v);
  outB[i].align = f32(nr);
  outB[i].dens = clamp(f32(no + na) / 60.0, 0.0, 1.0);`;

export const WGSL_BRAINS = `${WGSL_BRAIN_COMMON}
${walkers("vicsek", VICSEK_STATE, VICSEK_ACCUM, VICSEK_INTEGRATE)}
${walkers("couzin", COUZIN_STATE, COUZIN_ACCUM, COUZIN_INTEGRATE)}
`;

/**
 * Order parameters on the torus (for The Mill): the centre of mass is the
 * circular mean of the positions (each axis mapped to a circle), so a school
 * that drifts across the wrapped edge keeps its centre. Pass 1 sums unit
 * headings and the circle coordinates; finalize turns them into the centre;
 * pass 2 sums r̂ × v̂ and |r| about it with r the wrapped offset. Every sum is
 * an i32 per workgroup, totalled exactly in JS. The partials keep the v4
 * reduction's 10-word layout (vhx, vhy, px, py, cr, rd, vx, vy, ke, cnt), so
 * the same readers apply; px, py hold the circle sums' x parts.
 */
export const WGSL_TORUS_REDUCE = `
${WGSL_BOID}
struct RPart { vhx:i32, vhy:i32, px:i32, py:i32, cr:i32, rd:i32, vx:i32, vy:i32, ke:i32, cnt:u32 };
struct TP { halfW: f32, halfH: f32, _a: f32, _b: f32 };
struct TG { cx: f32, cy: f32, _a: f32, _b: f32 };
@group(0) @binding(0) var<uniform> T: TP;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> partials: array<RPart>;
@group(0) @binding(3) var<storage, read_write> tg: TG;
@group(0) @binding(4) var<storage, read_write> circ: array<vec4<i32>>;
var<workgroup> sA: array<vec4<i32>, 256>;
var<workgroup> sB: array<vec4<i32>, 256>;
var<workgroup> sF: array<vec4<f32>, 256>;
const RFV: f32 = 1048576.0;
const RFP: f32 = 16384.0;
fn wrapD(d0: vec2<f32>) -> vec2<f32> {
  var d = d0; let w = T.halfW * 2.0; let h = T.halfH * 2.0;
  if (d.x >  T.halfW) { d.x = d.x - w; } if (d.x < -T.halfW) { d.x = d.x + w; }
  if (d.y >  T.halfH) { d.y = d.y - h; } if (d.y < -T.halfH) { d.y = d.y + h; }
  return d;
}
@compute @workgroup_size(256)
fn circleSums(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); let t = lid.x;
  var a = vec4<i32>(0);
  if (i < n) {
    let p = inB[i].pos;
    let ax = (p.x / T.halfW) * 3.14159265; let ay = (p.y / T.halfH) * 3.14159265;
    a = vec4<i32>(i32(round(cos(ax) * 65536.0)), i32(round(sin(ax) * 65536.0)), i32(round(cos(ay) * 65536.0)), i32(round(sin(ay) * 65536.0)));
  }
  sA[t] = a;
  var s = 128u;
  loop { if (s == 0u) { break; } workgroupBarrier(); if (t < s) { sA[t] = sA[t] + sA[t + s]; } s = s >> 1u; }
  workgroupBarrier();
  if (t == 0u) { circ[wid.x] = sA[0]; }
}
@compute @workgroup_size(256)
fn circleCentre(@builtin(local_invocation_id) lid: vec3<u32>) {
  let t = lid.x; let m = arrayLength(&circ);
  // each workgroup's sum is exact; the f32 total (fixed order) only places the centre
  var acc = vec4<f32>(0.0);
  for (var k = t; k < m; k = k + 256u) { acc = acc + vec4<f32>(circ[k]); }
  sF[t] = acc;
  var s = 128u;
  loop { if (s == 0u) { break; } workgroupBarrier(); if (t < s) { sF[t] = sF[t] + sF[t + s]; } s = s >> 1u; }
  workgroupBarrier();
  if (t == 0u) {
    let tot = sF[0];
    tg.cx = atan2(tot.y, tot.x) / 3.14159265 * T.halfW;
    tg.cy = atan2(tot.w, tot.z) / 3.14159265 * T.halfH;
  }
}
@compute @workgroup_size(256)
fn aboutCentre(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
  let i = gid.x; let n = arrayLength(&inB); let t = lid.x;
  var a = vec4<i32>(0); var b = vec4<i32>(0);
  if (i < n) {
    let bo = inB[i];
    let spd = max(length(bo.vel), 1e-9);
    let u = bo.vel / spd;
    let r = wrapD(bo.pos - vec2<f32>(tg.cx, tg.cy));
    let rl = max(length(r), 1e-9);
    let rh = r / rl;
    a = vec4<i32>(i32(round(u.x * RFV)), i32(round(u.y * RFV)), i32(round((rh.x * u.y - rh.y * u.x) * RFV)), i32(round(rl * RFP)));
    b = vec4<i32>(0, 0, 0, 1);
  }
  sA[t] = a; sB[t] = b;
  var s = 128u;
  loop { if (s == 0u) { break; } workgroupBarrier(); if (t < s) { sA[t] = sA[t] + sA[t + s]; sB[t] = sB[t] + sB[t + s]; } s = s >> 1u; }
  workgroupBarrier();
  if (t == 0u) {
    partials[wid.x] = RPart(sA[0].x, sA[0].y, 0, 0, sA[0].z, sA[0].w, 0, 0, 0, u32(sB[0].w));
  }
}
`;
