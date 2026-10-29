// Swarm — Food Chain (03-boids-2d.md § The model, "Food Chain"): plankton
// → fish → sharks, with births and deaths. Illustrative ecology: the page
// claims nothing beyond what it measures (populations stay bounded, and how
// they rise and fall).
//
//   plankton  a field on the fish's own sort grid: logistic growth
//             r P (1 − P/K), diffusion, grazing, a faint seeding s₀;
//   fish      a Reynolds school (the v4 rule's weights, here in a new kernel
//             with i32 neighbour sums) that also climbs the plankton gradient
//             when hungry and flees sharks. Each step a fish pays its upkeep
//             and eats its share of its cell's grazing, ε P (1 − e^(−a n)) / n
//             for n fish in the cell; at energy 1 it splits in two, at 0 it
//             starves;
//   sharks    up to S hunters that swim towards the most fish they can sense,
//             catch the nearest fish within their jaws (one per catch, then a
//             handling time), pay their upkeep, split at energy 2 and starve
//             at 0.
// Births reuse empty slots deterministically: two exclusive scans rank the
// newborns and the empty slots, and the k-th newborn takes the k-th empty
// slot. With i32 neighbour sums, integer catch keys (atomicMin) and a serial
// shark pass, a run replays byte for byte on the same GPU.
// A trickle of newcomers (a few fish every two seconds; a shark every 15 s
// while fewer than two remain) keeps any population from staying extinct —
// the gentle immigration term the spec asks for, not a hidden reset.

import { CountingSort, PrefixScan, readBuffer } from "@bp/gpu";
import type { Flock, FlockExt } from "./flock.js";
import type { Grid, RuleParams } from "./params.js";
import { gridFor } from "./params.js";

export interface EcoParams {
  /** Plankton growth rate r per step, carrying capacity K, diffusion (cells² per step), seeding per step. */
  growth: number;
  K: number;
  diffusion: number;
  seeding: number;
  /** Grazing: the fraction of a cell's plankton one fish takes per step, a; the fraction turned into energy, ε. */
  graze: number;
  efficiency: number;
  /** Fish upkeep per step; a fish splits at energy 1. */
  fishCost: number;
  /** Shark upkeep per step, energy per fish eaten, energy at which it splits, steps it spends eating. */
  sharkCost: number;
  sharkGain: number;
  sharkBirth: number;
  handling: number;
  /** Shark speed (× the fish's top speed), how far it senses fish, its jaws, the fishes' fear radius (world units). */
  sharkSpeed: number;
  sense: number;
  jaws: number;
  fear: number;
  /** Steering weights: food (scaled by hunger), fear. */
  wFood: number;
  wFear: number;
  /** Immigration: `fishGroup` fish every `fishEvery` steps; a shark every `sharkEvery` steps while fewer than 2 live. */
  fishGroup: number;
  fishEvery: number;
  sharkEvery: number;
}

export const FOOD_CHAIN: EcoParams = {
  growth: 0.015,
  K: 1,
  diffusion: 0.03,
  seeding: 2e-6,
  graze: 0.006,
  efficiency: 0.11,
  fishCost: 0.00013,
  sharkCost: 0.0042,
  sharkGain: 0.25,
  sharkBirth: 2,
  handling: 10,
  sharkSpeed: 1.6,
  sense: 1.5,
  jaws: 0.07,
  fear: 0.35,
  wFood: 0.6,
  wFear: 1.5,
  fishGroup: 4,
  fishEvery: 120,
  sharkEvery: 900,
};

export interface EcoConfig {
  /** Fish slots (the ceiling); `fish0` of them start alive. */
  fish0: number;
  /** Shark slots (≤ 128); `sharks0` start alive. */
  sharkSlots: number;
  sharks0: number;
  params: EcoParams;
}

/** A tool's event, applied at the next step. */
export interface EcoBrush {
  /** Feed: plankton per step at the centre of a Gaussian of `radius`. */
  feed?: { x: number; y: number; radius: number; amount: number };
  /** Release: `count` fish around (x, y) — once. */
  release?: { x: number; y: number; radius: number; count: number };
}

export interface Census {
  fish: number;
  sharks: number;
  /** Mean plankton per cell, in units of K. */
  plankton: number;
  /** Fish born and fish eaten since the scene loaded (u32 counters). */
  births: number;
  eaten: number;
  /** Mean shark energy. */
  sharkEnergy: number;
}

export const SHARK_BYTES = 48;
const EP_FLOATS = 64;
const EP_BYTES = EP_FLOATS * 4;
const SLOT = 256;
export const MAX_SHARKS = 128;

const WGSL_COMMON = `
struct Boid { pos: vec2<f32>, vel: vec2<f32>, align: f32, dens: f32 };
struct EP {
  halfW: f32, halfH: f32, cols: f32, rows: f32,
  cellX: f32, cellY: f32, n: u32, deadKey: u32,
  frameSeed: u32, sharkSlots: u32, step: u32, _a: u32,
  maxSpeed: f32, minSpeed: f32, maxForce: f32, noise: f32,
  rSep2: f32, rAli2: f32, rCoh2: f32, _b: f32,
  wSep: f32, wAli: f32, wCoh: f32, wFood: f32,
  wFear: f32, fearR: f32, jaws: f32, _c: f32,
  growth: f32, K: f32, diff: f32, seeding: f32,
  graze: f32, eff: f32, fishCost: f32, _d: f32,
  sharkCost: f32, sharkGain: f32, sharkBirth: f32, handling: f32,
  sharkSpeed: f32, sense: f32, _e: f32, _f: f32,
  feedX: f32, feedY: f32, feedR: f32, feedAmt: f32,
  relX: f32, relY: f32, relR: f32, relN: u32,
  immN: u32, sharkImm: u32, _g: u32, _h: u32,
  _i: vec4<f32>,
};
const NONE: u32 = 0xffffffffu;
const PI: f32 = 3.14159265;
fn hashU(a: u32) -> u32 { var x = a; x = x ^ (x >> 16u); x = x * 0x7feb352du; x = x ^ (x >> 15u); x = x * 0x846ca68bu; x = x ^ (x >> 16u); return x; }
fn rnd(id: u32, k: u32) -> f32 { return f32(hashU((id * 0x9e3779b1u) ^ hashU(E.frameSeed + k * 0x68e31da4u)) >> 8u) / 16777216.0; }
fn wrapD(d0: vec2<f32>) -> vec2<f32> {
  var d = d0; let w = E.halfW * 2.0; let h = E.halfH * 2.0;
  if (d.x >  E.halfW) { d.x = d.x - w; } if (d.x < -E.halfW) { d.x = d.x + w; }
  if (d.y >  E.halfH) { d.y = d.y - h; } if (d.y < -E.halfH) { d.y = d.y + h; }
  return d;
}
fn wrapP(p: vec2<f32>) -> vec2<f32> {
  let W = vec2<f32>(2.0 * E.halfW, 2.0 * E.halfH);
  return p - W * floor((p + vec2<f32>(E.halfW, E.halfH)) / W);
}
fn cellXY(p: vec2<f32>) -> vec2<i32> {
  return vec2<i32>(i32(clamp(floor((p.x + E.halfW) / E.cellX), 0.0, E.cols - 1.0)),
                   i32(clamp(floor((p.y + E.halfH) / E.cellY), 0.0, E.rows - 1.0)));
}
fn cellOf(x: i32, y: i32) -> u32 {
  let c = i32(E.cols); let r = i32(E.rows);
  return u32((((y % r) + r) % r) * c + (((x % c) + c) % c));
}
fn unitOf(v: vec2<f32>, fb: vec2<f32>) -> vec2<f32> { let l = length(v); return select(fb, v / l, l > 1e-12); }
fn limit(v: vec2<f32>, m: f32) -> vec2<f32> { let l = length(v); return select(v, v * (m / l), l > m); }
fn rot(v: vec2<f32>, a: f32) -> vec2<f32> { let c = cos(a); let s = sin(a); return vec2<f32>(v.x * c - v.y * s, v.x * s + v.y * c); }
`;

export const SHARK_A = `struct Shark { pos: vec2<f32>, vel: vec2<f32>, energy: f32, alive: f32, meals: u32, age: f32, cool: f32, catchKey: atomic<u32>, lastCatch: u32, _p: u32 };`;

// ---- keys: alive fish → their cell; empty slots → the bucket past the grid ------------------
const WGSL_KEYS = `
${WGSL_COMMON}
@group(0) @binding(0) var<uniform> E: EP;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> keys: array<u32>;
@compute @workgroup_size(256)
fn ecoKeys(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; if (i >= E.n) { return; }
  let b = inB[i];
  if (b.dens < 0.0) { keys[i] = E.deadKey; return; }
  let c = cellXY(b.pos);
  keys[i] = u32(c.y) * u32(E.cols) + u32(c.x);
}
`;

// ---- the fish: school, graze, flee, starve; and offer themselves to the sharks -------------
const WGSL_FORAGE = `
${WGSL_COMMON}
${SHARK_A}
@group(0) @binding(0) var<uniform> E: EP;
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> outB: array<Boid>;
@group(0) @binding(3) var<storage, read_write> life: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> sharks: array<Shark>;
@group(0) @binding(5) var<storage, read> plankton: array<f32>;
@group(0) @binding(6) var<storage, read> cellStart: array<u32>;
@group(0) @binding(7) var<storage, read> order: array<u32>;
@compute @workgroup_size(256)
fn forage(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; if (i >= E.n) { return; }
  let me = inB[i];
  if (me.dens < 0.0) { outB[i] = me; return; }
  // a shark caught this fish last step
  for (var s = 0u; s < E.sharkSlots; s = s + 1u) {
    if (sharks[s].lastCatch == i) {
      outB[i] = Boid(me.pos, vec2<f32>(0.0), 0.0, -1.0);
      life[i] = vec2<f32>(0.0, 0.0);
      return;
    }
  }
  let p = me.pos;
  let v = me.vel;
  let h = unitOf(v, vec2<f32>(1.0, 0.0));
  var sx: i32 = 0; var sy: i32 = 0;
  var ax: i32 = 0; var ay: i32 = 0; var na: u32 = 0u;
  var cx: i32 = 0; var cy: i32 = 0; var nc: u32 = 0u;
  let g = cellXY(p);
  let cols = i32(E.cols); let rows = i32(E.rows);
  for (var oy = -1; oy <= 1; oy = oy + 1) {
    for (var ox = -1; ox <= 1; ox = ox + 1) {
      let c = cellOf(g.x + ox, g.y + oy);
      let end = cellStart[c + 1u];
      for (var k = cellStart[c]; k < end; k = k + 1u) {
        let j = order[k];
        if (j == i) { continue; }
        let o = inB[j];
        let d = wrapD(o.pos - p);
        let d2 = dot(d, d);
        if (d2 < E.rCoh2 && d2 > 1e-14) {
          cx = cx + i32(round(d.x * 65536.0)); cy = cy + i32(round(d.y * 65536.0)); nc = nc + 1u;
          if (d2 < E.rAli2) {
            let u = unitOf(o.vel, vec2<f32>(1.0, 0.0));
            ax = ax + i32(round(u.x * 65536.0)); ay = ay + i32(round(u.y * 65536.0)); na = na + 1u;
          }
          if (d2 < E.rSep2) {
            let dl = sqrt(d2);
            let w = 1.0 - dl / sqrt(E.rSep2);
            sx = sx - i32(round(d.x / dl * w * 65536.0)); sy = sy - i32(round(d.y / dl * w * 65536.0));
          }
        }
      }
    }
  }
  var acc = vec2<f32>(0.0);
  let vmax = E.maxSpeed;
  if (sx != 0 || sy != 0) { acc = acc + E.wSep * limit(unitOf(vec2<f32>(f32(sx), f32(sy)), h) * vmax - v, E.maxForce); }
  if (na > 0u) { acc = acc + E.wAli * limit(unitOf(vec2<f32>(f32(ax), f32(ay)), h) * vmax - v, E.maxForce); }
  if (nc > 0u) { acc = acc + E.wCoh * limit(unitOf(vec2<f32>(f32(cx), f32(cy)), h) * vmax - v, E.maxForce); }
  // hungry fish climb the plankton gradient
  var en = life[i].x;
  let hunger = clamp(1.0 - en, 0.0, 1.0);
  let grad = vec2<f32>(plankton[cellOf(g.x + 1, g.y)] - plankton[cellOf(g.x - 1, g.y)], plankton[cellOf(g.x, g.y + 1)] - plankton[cellOf(g.x, g.y - 1)]);
  if (dot(grad, grad) > 1e-10) { acc = acc + E.wFood * hunger * limit(normalize(grad) * vmax - v, E.maxForce); }
  // sharks: flee anything within the fear radius
  var away = vec2<f32>(0.0);
  for (var s = 0u; s < E.sharkSlots; s = s + 1u) {
    if (sharks[s].alive < 0.5) { continue; }
    let d = wrapD(p - sharks[s].pos);
    let dl = length(d);
    if (dl < E.fearR && dl > 1e-6) { away = away + d / dl * (1.0 - dl / E.fearR); }
  }
  if (dot(away, away) > 0.0) { acc = acc + E.wFear * limit(normalize(away) * vmax - v, 2.0 * E.maxForce); }
  var nv = v + acc;
  if (E.noise > 0.0) { nv = rot(nv, (rnd(i, 0u) * 2.0 - 1.0) * E.noise * PI); }
  let sp = length(nv);
  if (sp > vmax) { nv = nv * (vmax / sp); } else if (sp < E.minSpeed) { nv = unitOf(nv, h) * E.minSpeed; }
  let np = wrapP(p + nv);
  // graze the cell it was in (the sort's count is every live fish there)
  let c0 = cellOf(g.x, g.y);
  let n0 = f32(max(cellStart[c0 + 1u] - cellStart[c0], 1u));
  let P = plankton[c0];
  en = en + E.eff * P * (1.0 - exp(-E.graze * n0)) / n0 - E.fishCost;
  if (en <= 0.0) {
    outB[i] = Boid(np, vec2<f32>(0.0), 0.0, -1.0);
    life[i] = vec2<f32>(0.0, 0.0);
    return;
  }
  life[i] = vec2<f32>(en, 0.0);
  outB[i] = Boid(np, nv, en, f32(nc) / 30.0);
  // within a free shark's jaws: offer (distance, index) — the shark takes the nearest
  for (var s = 0u; s < E.sharkSlots; s = s + 1u) {
    if (sharks[s].alive < 0.5 || sharks[s].cool > 0.0) { continue; }
    let dl = length(wrapD(np - sharks[s].pos));
    if (dl < E.jaws) {
      let q = min(u32(dl / E.jaws * 4095.0), 4095u);
      atomicMin(&sharks[s].catchKey, (q << 20u) | i);
    }
  }
}
`;

// ---- plankton: growth, diffusion, grazing, the visitor's feeding ----------------------------
const WGSL_PLANKTON = `
${WGSL_COMMON}
@group(0) @binding(0) var<uniform> E: EP;
@group(0) @binding(1) var<storage, read> pIn: array<f32>;
@group(0) @binding(2) var<storage, read_write> pOut: array<f32>;
@group(0) @binding(3) var<storage, read> cellStart: array<u32>;
@compute @workgroup_size(256)
fn plankton(@builtin(global_invocation_id) gid: vec3<u32>) {
  let c = gid.x; let cells = u32(E.cols) * u32(E.rows); if (c >= cells) { return; }
  let x = i32(c % u32(E.cols)); let y = i32(c / u32(E.cols));
  let P = pIn[c];
  let lap = pIn[cellOf(x + 1, y)] + pIn[cellOf(x - 1, y)] + pIn[cellOf(x, y + 1)] + pIn[cellOf(x, y - 1)] - 4.0 * P;
  let n = f32(cellStart[c + 1u] - cellStart[c]);
  let eaten = P * (1.0 - exp(-E.graze * n));
  var feed = 0.0;
  if (E.feedAmt > 0.0) {
    let ctr = vec2<f32>(-E.halfW + (f32(x) + 0.5) * E.cellX, -E.halfH + (f32(y) + 0.5) * E.cellY);
    let d = wrapD(ctr - vec2<f32>(E.feedX, E.feedY));
    feed = E.feedAmt * exp(-dot(d, d) / (E.feedR * E.feedR));
  }
  pOut[c] = clamp(P + E.growth * P * (1.0 - P / E.K) + E.diff * lap - eaten + E.seeding + feed, 0.0, 2.0 * E.K);
}
`;

// ---- births: flags → two scans → the empty slots listed → newborns placed -------------------
const WGSL_BIRTH = `
${WGSL_COMMON}
@group(0) @binding(0) var<uniform> E: EP;
@group(0) @binding(1) var<storage, read_write> boids: array<Boid>;
@group(0) @binding(2) var<storage, read_write> life: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> deadScan: array<u32>;
@group(0) @binding(4) var<storage, read_write> bornScan: array<u32>;
@group(0) @binding(5) var<storage, read_write> deadList: array<u32>;
@group(0) @binding(6) var<storage, read_write> counters: array<atomic<u32>>;
fn wantsBirth(i: u32) -> bool { return boids[i].dens >= 0.0 && life[i].x >= 1.0; }
@compute @workgroup_size(256)
fn flags(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; if (i > E.n) { return; }
  if (i == E.n) { deadScan[i] = 0u; bornScan[i] = 0u; return; }
  deadScan[i] = select(0u, 1u, boids[i].dens < 0.0);
  bornScan[i] = select(0u, 1u, wantsBirth(i));
}
@compute @workgroup_size(256)
fn listDead(@builtin(global_invocation_id) gid: vec3<u32>) {
  let j = gid.x; if (j >= E.n) { return; }
  if (boids[j].dens < 0.0) { deadList[deadScan[j]] = j; }
}
fn place(slot: u32, pos: vec2<f32>, vel: vec2<f32>, en: f32) {
  boids[slot] = Boid(wrapP(pos), vel, en, 0.0);
  life[slot] = vec2<f32>(en, 0.0);
}
@compute @workgroup_size(256)
fn spawn(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x; if (i >= E.n) { return; }
  if (!wantsBirth(i)) { return; }
  let r = bornScan[i];
  if (r >= deadScan[E.n]) { return; }   // the ocean is full: the birth waits
  let slot = deadList[r];
  let b = boids[i];
  let en = life[i].x * 0.5;
  life[i] = vec2<f32>(en, 0.0);
  boids[i].align = en;
  let a = (rnd(i, 7u) * 2.0 - 1.0) * 0.6;
  let off = rot(unitOf(b.vel, vec2<f32>(1.0, 0.0)), a + PI * 0.5) * sqrt(E.rSep2);
  place(slot, b.pos + off, rot(b.vel, a), en);
  atomicAdd(&counters[0], 1u);
}
// newcomers: the immigration trickle and the Release tool, after this step's births
@compute @workgroup_size(64)
fn arrive(@builtin(global_invocation_id) gid: vec3<u32>) {
  let k = gid.x;
  if (k >= E.immN + E.relN) { return; }
  let r = bornScan[E.n] + k;
  if (r >= deadScan[E.n]) { return; }
  let slot = deadList[r];
  var ctr: vec2<f32>; var rad: f32;
  if (k < E.immN) {
    // a small group at a place hashed from the step
    ctr = vec2<f32>((rnd(0u, 11u) * 2.0 - 1.0) * E.halfW, (rnd(0u, 12u) * 2.0 - 1.0) * E.halfH);
    rad = 0.15;
  } else {
    ctr = vec2<f32>(E.relX, E.relY);
    rad = E.relR;
  }
  let a = rnd(k, 13u) * 2.0 * PI;
  let d = sqrt(rnd(k, 14u)) * rad;
  let heading = rnd(0u, 15u) * 2.0 * PI + (rnd(k, 16u) - 0.5) * 0.6;
  place(slot, ctr + d * vec2<f32>(cos(a), sin(a)), vec2<f32>(cos(heading), sin(heading)) * E.maxSpeed * 0.7, 0.6);
}
`;

// ---- the sharks: one workgroup, a thread per slot; births and arrivals in a serial pass -----
const WGSL_SHARKS = `
${WGSL_COMMON}
${SHARK_A}
@group(0) @binding(0) var<uniform> E: EP;
@group(0) @binding(1) var<storage, read_write> sharks: array<Shark>;
@group(0) @binding(2) var<storage, read> cellStart: array<u32>;
@group(0) @binding(3) var<storage, read_write> counters: array<atomic<u32>>;
var<workgroup> want: array<u32, 128>;
// every shark's place before anyone moves (so no shark reads another's new position)
var<workgroup> was: array<vec4<f32>, 128>;
@compute @workgroup_size(128)
fn hunt(@builtin(local_invocation_id) lid: vec3<u32>) {
  let s = lid.x;
  want[s] = 0u;
  if (s < E.sharkSlots) { was[s] = vec4<f32>(sharks[s].pos, sharks[s].alive, 0.0); } else { was[s] = vec4<f32>(0.0); }
  workgroupBarrier();
  if (s < E.sharkSlots && sharks[s].alive > 0.5) {
    let key = atomicLoad(&sharks[s].catchKey);
    var energy = sharks[s].energy;
    var cool = max(sharks[s].cool - 1.0, 0.0);
    var last = NONE;
    var meals = sharks[s].meals;
    let age = sharks[s].age;
    if (key != NONE) {
      last = key & 0xfffffu;
      energy = energy + E.sharkGain;
      cool = E.handling;
      meals = meals + 1u;
      atomicAdd(&counters[1], 1u);
    }
    // a sated shark stores at most 1.5× its splitting energy
    energy = min(energy, 1.5 * E.sharkBirth) - E.sharkCost;
    var pos = sharks[s].pos;
    var vel = sharks[s].vel;
    var alive = 1.0;
    if (energy <= 0.0) {
      alive = 0.0;
    } else {
      // sense: charge the nearest crowd — the cell within reach with the most fish for its
      // distance, n / (d² + 0.02) (a fish-weighted centre would sit in the hole the school
      // opens around the shark). Fixed scan order and a strict > keep it deterministic.
      let rx = i32(ceil(E.sense / E.cellX)); let ry = i32(ceil(E.sense / E.cellY));
      let g = cellXY(pos);
      let inCell = pos - vec2<f32>(-E.halfW + (f32(g.x) + 0.5) * E.cellX, -E.halfH + (f32(g.y) + 0.5) * E.cellY);
      var best = 0.0; var aim = vec2<f32>(0.0);
      for (var oy = -ry; oy <= ry; oy = oy + 1) {
        for (var ox = -rx; ox <= rx; ox = ox + 1) {
          let c = cellOf(g.x + ox, g.y + oy);
          let n = f32(cellStart[c + 1u] - cellStart[c]);
          if (n <= 0.0) { continue; }
          let off = vec2<f32>(f32(ox) * E.cellX, f32(oy) * E.cellY) - inCell;
          let d2 = dot(off, off);
          if (d2 > E.sense * E.sense) { continue; }
          let sc = n / (d2 + 0.02);
          if (sc > best) { best = sc; aim = off; }
        }
      }
      let h = unitOf(vel, vec2<f32>(1.0, 0.0));
      var des = h;
      var speed = E.sharkSpeed * 0.65;
      if (best > 0.0) {
        des = unitOf(aim, h);
        speed = E.sharkSpeed;
      } else {
        des = rot(h, (rnd(s, 21u) * 2.0 - 1.0) * 0.3);
      }
      // keep apart from other sharks
      var apart = vec2<f32>(0.0);
      for (var o = 0u; o < E.sharkSlots; o = o + 1u) {
        if (o == s || was[o].z < 0.5) { continue; }
        let d = wrapD(pos - was[o].xy);
        let dl = length(d);
        if (dl < 1.0 && dl > 1e-6) { apart = apart + d / dl * (1.0 - dl); }
      }
      des = unitOf(des + apart * 1.5, h);
      if (cool > 0.0) { speed = speed * 0.5; }
      let ang = atan2(h.x * des.y - h.y * des.x, dot(h, des));
      let nh = rot(h, clamp(ang, -0.12, 0.12));
      vel = nh * speed;
      pos = wrapP(pos + vel);
      if (energy >= E.sharkBirth) { want[s] = 1u; }
    }
    sharks[s].pos = pos;
    sharks[s].vel = vel;
    sharks[s].energy = energy;
    sharks[s].alive = alive;
    sharks[s].meals = meals;
    sharks[s].age = age + 1.0;
    sharks[s].cool = cool;
    sharks[s].lastCatch = last;
    atomicStore(&sharks[s].catchKey, NONE);
  } else if (s < E.sharkSlots) {
    sharks[s].lastCatch = NONE;
    atomicStore(&sharks[s].catchKey, NONE);
  }
  storageBarrier();
  workgroupBarrier();
  if (s != 0u) { return; }
  // serial: births in slot order into the first free slots, then an arrival if the sharks are nearly gone
  var free = 0u;
  var alive = 0u;
  for (var k = 0u; k < E.sharkSlots; k = k + 1u) { if (sharks[k].alive > 0.5) { alive = alive + 1u; } }
  for (var k = 0u; k < E.sharkSlots; k = k + 1u) {
    if (want[k] == 0u) { continue; }
    loop { if (free >= E.sharkSlots || sharks[free].alive < 0.5) { break; } free = free + 1u; }
    if (free >= E.sharkSlots) { break; }
    let en = sharks[k].energy * 0.5;
    sharks[k].energy = en;
    let a = select(-0.9, 0.9, (k & 1u) == 0u);
    sharks[free].pos = wrapP(sharks[k].pos + rot(unitOf(sharks[k].vel, vec2<f32>(1.0, 0.0)), a + PI * 0.5) * 0.2);
    sharks[free].vel = rot(sharks[k].vel, a);
    sharks[free].energy = en;
    sharks[free].alive = 1.0;
    sharks[free].meals = 0u;
    sharks[free].age = 0.0;
    sharks[free].cool = E.handling;
    sharks[free].lastCatch = NONE;
    alive = alive + 1u;
    free = free + 1u;
  }
  if (E.sharkImm != 0u && alive < 2u) {
    for (var k = 0u; k < E.sharkSlots; k = k + 1u) {
      if (sharks[k].alive > 0.5) { continue; }
      let a = rnd(0u, 31u) * 2.0 * PI;
      sharks[k].pos = vec2<f32>((rnd(0u, 32u) * 2.0 - 1.0) * E.halfW, (rnd(0u, 33u) * 2.0 - 1.0) * E.halfH);
      sharks[k].vel = vec2<f32>(cos(a), sin(a)) * E.sharkSpeed * 0.65;
      sharks[k].energy = 1.0;
      sharks[k].alive = 1.0;
      sharks[k].meals = 0u;
      sharks[k].age = 0.0;
      sharks[k].cool = 0.0;
      sharks[k].lastCatch = NONE;
      break;
    }
  }
}
`;

// ---- the census the page reads every few frames ------------------------------------------------
export const WGSL_CENSUS = `
${WGSL_COMMON}
struct SharkR { pos: vec2<f32>, vel: vec2<f32>, energy: f32, alive: f32, meals: u32, age: f32, cool: f32, catchKey: u32, lastCatch: u32, _p: u32 };
@group(0) @binding(0) var<uniform> E: EP;
@group(0) @binding(1) var<storage, read> plankton: array<f32>;
@group(0) @binding(2) var<storage, read> sharks: array<SharkR>;
@group(0) @binding(3) var<storage, read> deadScan: array<u32>;
@group(0) @binding(4) var<storage, read> counters: array<u32>;
@group(0) @binding(5) var<storage, read_write> censusOut: array<f32>;
@group(0) @binding(6) var<storage, read> boids: array<Boid>;
var<workgroup> sp: array<f32, 256>;
var<workgroup> sn: array<u32, 256>;
@compute @workgroup_size(256)
fn census(@builtin(local_invocation_id) lid: vec3<u32>) {
  let t = lid.x; let cells = u32(E.cols) * u32(E.rows);
  var acc = 0.0;
  for (var c = t; c < cells; c = c + 256u) { acc = acc + plankton[c]; }
  var live = 0u;
  for (var i = t; i < E.n; i = i + 256u) { if (boids[i].dens >= 0.0) { live = live + 1u; } }
  sp[t] = acc;
  sn[t] = live;
  var st = 128u;
  loop { if (st == 0u) { break; } workgroupBarrier(); if (t < st) { sp[t] = sp[t] + sp[t + st]; sn[t] = sn[t] + sn[t + st]; } st = st >> 1u; }
  workgroupBarrier();
  if (t == 0u) {
    var ns = 0.0; var es = 0.0;
    for (var s = 0u; s < E.sharkSlots; s = s + 1u) { if (sharks[s].alive > 0.5) { ns = ns + 1.0; es = es + sharks[s].energy; } }
    censusOut[0] = f32(sn[0]);
    censusOut[1] = ns;
    censusOut[2] = sp[0] / (f32(cells) * E.K);
    censusOut[3] = f32(counters[0]);
    censusOut[4] = f32(counters[1]);
    censusOut[5] = select(0.0, es / ns, ns > 0.0);
  }
}
`;

type BindKind = GPUBufferBindingType;
interface Kernel {
  layout: GPUBindGroupLayout;
  pipe: GPUComputePipeline;
}

export class EcoKernels {
  private constructor(
    readonly keys: Kernel,
    readonly forage: Kernel,
    readonly plankton: Kernel,
    readonly flags: Kernel,
    readonly listDead: Kernel,
    readonly spawn: Kernel,
    readonly arrive: Kernel,
    readonly hunt: Kernel,
    readonly census: Kernel,
  ) {}

  static async create(device: GPUDevice): Promise<EcoKernels> {
    const mods = new Map<string, Promise<GPUShaderModule>>();
    const mod = (label: string, code: string): Promise<GPUShaderModule> => {
      let m = mods.get(label);
      if (!m) {
        m = (async () => {
          const sm = device.createShaderModule({ label, code });
          const info = await sm.getCompilationInfo();
          const errs = info.messages.filter((x) => x.type === "error");
          if (errs.length) throw new Error(`${label} shader: ${errs.map((e) => `${e.lineNum}:${e.message}`).join(" | ")}`);
          return sm;
        })();
        mods.set(label, m);
      }
      return m;
    };
    const k = async (label: string, code: string, entry: string, kinds: BindKind[]): Promise<Kernel> => {
      const layout = device.createBindGroupLayout({
        label: `swarm-eco-${entry}`,
        entries: kinds.map((type, binding) => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type, hasDynamicOffset: binding === 0 } })),
      });
      const pipe = await device.createComputePipelineAsync({
        label: `swarm-eco-${entry}`,
        layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        compute: { module: await mod(label, code), entryPoint: entry },
      });
      return { layout, pipe };
    };
    const U: BindKind = "uniform";
    const R: BindKind = "read-only-storage";
    const W: BindKind = "storage";
    const birth: BindKind[] = [U, W, W, W, W, W, W];
    const [keys, forage, plankton, flags, listDead, spawn, arrive, hunt, census] = await Promise.all([
      k("eco-keys", WGSL_KEYS, "ecoKeys", [U, R, W]),
      k("eco-forage", WGSL_FORAGE, "forage", [U, R, W, W, W, R, R, R]),
      k("eco-plankton", WGSL_PLANKTON, "plankton", [U, R, W, R]),
      k("eco-birth", WGSL_BIRTH, "flags", birth),
      k("eco-birth", WGSL_BIRTH, "listDead", birth),
      k("eco-birth", WGSL_BIRTH, "spawn", birth),
      k("eco-birth", WGSL_BIRTH, "arrive", birth),
      k("eco-sharks", WGSL_SHARKS, "hunt", [U, W, R, W]),
      k("eco-census", WGSL_CENSUS, "census", [U, R, R, R, R, W, R]),
    ]);
    return new EcoKernels(keys, forage, plankton, flags, listDead, spawn, arrive, hunt, census);
  }
}

const STORAGE = (): number => GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

/** A smooth patchy plankton start: a few long cosine waves with hashed phases, in [0.25, 1]·K. */
export function plankton0(cols: number, rows: number, seed: number, K: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(cols * rows);
  let s = (seed * 2654435761 + 12345) >>> 0;
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const waves = Array.from({ length: 6 }, () => ({ kx: 1 + Math.floor(rnd() * 3), ky: 1 + Math.floor(rnd() * 2), ph: rnd() * 2 * Math.PI, ph2: rnd() * 2 * Math.PI }));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      let v = 0;
      for (const w of waves) v += Math.cos((2 * Math.PI * w.kx * x) / cols + w.ph) * Math.cos((2 * Math.PI * w.ky * y) / rows + w.ph2);
      out[y * cols + x] = K * Math.min(1, Math.max(0.25, 0.62 + 0.14 * v));
    }
  }
  return out;
}

/** The first sharks: `count` alive at hashed places, the rest empty slots. */
export function sharks0(slots: number, count: number, seed: number, halfW: number, halfH: number, speed: number): ArrayBuffer {
  const ab = new ArrayBuffer(slots * SHARK_BYTES);
  const f = new Float32Array(ab);
  const u = new Uint32Array(ab);
  let s = (seed * 2246822519 + 7) >>> 0;
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let k = 0; k < slots; k += 1) {
    const o = (k * SHARK_BYTES) / 4;
    const a = rnd() * 2 * Math.PI;
    f[o] = (rnd() * 2 - 1) * halfW;
    f[o + 1] = (rnd() * 2 - 1) * halfH;
    f[o + 2] = Math.cos(a) * speed;
    f[o + 3] = Math.sin(a) * speed;
    f[o + 4] = k < count ? 1 : 0;
    f[o + 5] = k < count ? 1 : 0;
    u[o + 6] = 0;
    f[o + 7] = 1000;
    f[o + 8] = 0;
    u[o + 9] = 0xffffffff;
    u[o + 10] = 0xffffffff;
  }
  return ab;
}

/**
 * The ecology as a flock extension: its step replaces the brain's (the fish
 * are this file's forager kernel), on the flock's own ping-pong boid buffers.
 */
export class EcologyExt implements FlockExt {
  readonly grid: Grid;
  readonly cells: number;
  readonly sharkSlots: number;
  params: EcoParams;
  readonly fish0: number;
  readonly sharks0: number;
  /** The next step's tools (cleared once applied). */
  brush: EcoBrush = {};
  readonly plankton: [GPUBuffer, GPUBuffer];
  readonly sharks: GPUBuffer;
  readonly census: GPUBuffer;
  /** Which plankton buffer holds the current field. */
  pCur = 0;
  private readonly device: GPUDevice;
  private readonly k: EcoKernels;
  private readonly flock: Flock;
  private readonly n: number;
  private readonly life: GPUBuffer;
  private readonly keys: GPUBuffer;
  private readonly sort: CountingSort;
  private readonly deadScan: GPUBuffer;
  private readonly bornScan: GPUBuffer;
  private readonly deadList: GPUBuffer;
  private readonly counters: GPUBuffer;
  private readonly scanDead: PrefixScan;
  private readonly scanBorn: PrefixScan;
  private readonly uni: GPUBuffer;
  private readonly slots = new ArrayBuffer(16 * SLOT);
  private readonly bg: Map<string, GPUBindGroup> = new Map();

  constructor(device: GPUDevice, kernels: EcoKernels, flock: Flock, cfg: EcoConfig) {
    this.device = device;
    this.k = kernels;
    this.flock = flock;
    this.n = flock.n;
    if (this.n >= 1 << 20) throw new Error("Food Chain holds at most 2^20 fish (the catch key's index field)");
    this.params = { ...cfg.params };
    this.fish0 = cfg.fish0;
    this.sharks0 = cfg.sharks0;
    this.sharkSlots = Math.min(MAX_SHARKS, cfg.sharkSlots);
    this.grid = gridFor(flock.halfW, flock.halfH, flock.rule.rCoh);
    this.cells = this.grid.cols * this.grid.rows;
    const n = this.n;
    const buf = (size: number, label: string): GPUBuffer => device.createBuffer({ size: Math.max(16, size), usage: STORAGE(), label: `swarm-eco-${label}` });
    this.plankton = [buf(this.cells * 4, "plankton-0"), buf(this.cells * 4, "plankton-1")];
    this.sharks = buf(this.sharkSlots * SHARK_BYTES, "sharks");
    this.life = buf(n * 8, "life");
    this.keys = buf(n * 4, "keys");
    this.deadScan = buf((n + 1) * 4, "dead-scan");
    this.bornScan = buf((n + 1) * 4, "born-scan");
    this.deadList = buf(n * 4, "dead-list");
    this.counters = buf(16, "counters");
    this.census = buf(32, "census");
    this.sort = new CountingSort(device, { maxItems: n, keyCount: this.cells + 1, label: "swarm-eco-sort" });
    this.scanDead = new PrefixScan(device, this.deadScan, n + 1, "swarm-eco-scan-dead");
    this.scanBorn = new PrefixScan(device, this.bornScan, n + 1, "swarm-eco-scan-born");
    this.uni = device.createBuffer({ size: this.slots.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: "swarm-eco-params" });
  }

  private group(kernel: Kernel, key: string, bufs: GPUBuffer[]): GPUBindGroup {
    const id = `${key}`;
    let g = this.bg.get(id);
    if (!g) {
      g = this.device.createBindGroup({
        layout: kernel.layout,
        label: `swarm-eco-${key}`,
        entries: bufs.map((b, i) => ({ binding: i, resource: i === 0 ? { buffer: b, offset: 0, size: EP_BYTES } : { buffer: b } })),
      });
      this.bg.set(id, g);
    }
    return g;
  }

  reseed(seed: number): void {
    const q = this.device.queue;
    // the flock seeded fish0 live fish (shapeInit emptied the other slots)
    const life = new Float32Array(this.n * 2);
    for (let i = 0; i < this.n; i += 1) life[2 * i] = i < this.fish0 ? 0.35 + 0.3 * (((i * 2654435761) >>> 0) / 4294967296) : 0;
    q.writeBuffer(this.life, 0, life);
    const p0 = plankton0(this.grid.cols, this.grid.rows, seed, this.params.K);
    q.writeBuffer(this.plankton[0], 0, p0);
    q.writeBuffer(this.plankton[1], 0, p0);
    this.pCur = 0;
    q.writeBuffer(this.sharks, 0, sharks0(this.sharkSlots, this.sharks0, seed, this.flock.halfW, this.flock.halfH, this.rule.maxSpeed));
    q.writeBuffer(this.counters, 0, new Uint32Array(4));
    this.brush = {};
  }

  /** Slots ≥ fish0 start empty. */
  shapeInit(data: Float32Array): void {
    for (let i = this.fish0; i < data.length / 6; i += 1) {
      data[i * 6 + 2] = 0;
      data[i * 6 + 3] = 0;
      data[i * 6 + 5] = -1;
    }
  }

  /** The fish's rule is the flock's (Tune edits it there). */
  get rule(): RuleParams {
    return this.flock.rule;
  }

  prepare(steps: number, tick: number, pure: boolean): void {
    const p = this.params;
    const r = this.rule;
    const b = pure ? {} : this.brush;
    for (let s = 0; s < steps; s += 1) {
      const f = new Float32Array(this.slots, s * SLOT, EP_FLOATS);
      const u = new Uint32Array(this.slots, s * SLOT, EP_FLOATS);
      f.fill(0);
      const step = tick + s;
      f.set([this.flock.halfW, this.flock.halfH, this.grid.cols, this.grid.rows, this.grid.cellX, this.grid.cellY], 0);
      u[6] = this.n;
      u[7] = this.cells;
      u[8] = (Math.imul(this.flock.seed >>> 0, 0x9e3779b1) ^ Math.imul(step >>> 0, 0x85ebca6b)) >>> 0;
      u[9] = this.sharkSlots;
      u[10] = step >>> 0;
      f.set([r.maxSpeed, r.maxSpeed * 0.42, r.maxSpeed * 0.14, r.noise], 12);
      f.set([(r.rCoh * 0.3) ** 2, (r.rCoh * 0.72) ** 2, r.rCoh ** 2, 0], 16);
      f.set([r.wSep, r.wAli, r.wCoh, p.wFood], 20);
      f.set([p.wFear, p.fear, p.jaws, 0], 24);
      f.set([p.growth, p.K, p.diffusion, p.seeding], 28);
      f.set([p.graze, p.efficiency, p.fishCost, 0], 32);
      f.set([p.sharkCost, p.sharkGain, p.sharkBirth, p.handling], 36);
      f.set([p.sharkSpeed * r.maxSpeed, p.sense, 0, 0], 40);
      if (b.feed) f.set([b.feed.x, b.feed.y, b.feed.radius, b.feed.amount], 44);
      if (b.release && s === 0) {
        f.set([b.release.x, b.release.y, b.release.radius], 48);
        u[51] = b.release.count;
      }
      u[52] = step > 0 && step % p.fishEvery === 0 ? p.fishGroup : 0;
      u[53] = step > 0 && step % p.sharkEvery === 0 ? 1 : 0;
    }
    if (!pure && b.release) this.brush = { ...this.brush, release: undefined };
    this.device.queue.writeBuffer(this.uni, 0, this.slots, 0, steps * SLOT);
  }

  step(pass: GPUComputePassEncoder, s: number, c: number): boolean {
    const kk = this.k;
    const off = [s * SLOT];
    const inB = this.flock.boidBufs[c]!;
    const outB = this.flock.boidBufs[1 - c]!;
    const pIn = this.plankton[this.pCur]!;
    const pOut = this.plankton[1 - this.pCur]!;
    const n = this.n;
    const wg = Math.ceil(n / 256);
    pass.setPipeline(kk.keys.pipe);
    pass.setBindGroup(0, this.group(kk.keys, `keys${c}`, [this.uni, inB, this.keys]), off);
    pass.dispatchWorkgroups(wg);
    this.sort.encode(pass, this.keys);
    pass.setPipeline(kk.forage.pipe);
    pass.setBindGroup(0, this.group(kk.forage, `forage${c}${this.pCur}`, [this.uni, inB, outB, this.life, this.sharks, pIn, this.sort.cellStart, this.sort.order]), off);
    pass.dispatchWorkgroups(wg);
    pass.setPipeline(kk.plankton.pipe);
    pass.setBindGroup(0, this.group(kk.plankton, `plankton${this.pCur}`, [this.uni, pIn, pOut, this.sort.cellStart]), off);
    pass.dispatchWorkgroups(Math.ceil(this.cells / 256));
    this.pCur = 1 - this.pCur;
    // births into the new state
    const birth = this.group(kk.flags, `birth${c}`, [this.uni, outB, this.life, this.deadScan, this.bornScan, this.deadList, this.counters]);
    pass.setPipeline(kk.flags.pipe);
    pass.setBindGroup(0, birth, off);
    pass.dispatchWorkgroups(Math.ceil((n + 1) / 256));
    this.scanDead.encode(pass);
    this.scanBorn.encode(pass);
    pass.setPipeline(kk.listDead.pipe);
    pass.setBindGroup(0, birth, off);
    pass.dispatchWorkgroups(wg);
    pass.setPipeline(kk.spawn.pipe);
    pass.setBindGroup(0, birth, off);
    pass.dispatchWorkgroups(wg);
    pass.setPipeline(kk.arrive.pipe);
    pass.setBindGroup(0, birth, off);
    pass.dispatchWorkgroups(Math.ceil(2048 / 64));
    pass.setPipeline(kk.hunt.pipe);
    pass.setBindGroup(0, this.group(kk.hunt, "hunt", [this.uni, this.sharks, this.sort.cellStart, this.counters]), off);
    pass.dispatchWorkgroups(1);
    return true;
  }

  /** Record the census of the flock's current state (call after the frame's steps). */
  encodeCensus(enc: GPUCommandEncoder): void {
    const boids = this.flock.boids;
    const c = boids === this.flock.boidBufs[0] ? 0 : 1;
    const p = enc.beginComputePass({ label: "swarm-eco-census" });
    p.setPipeline(this.k.census.pipe);
    p.setBindGroup(0, this.group(this.k.census, `census${this.pCur}${c}`, [this.uni, this.plankton[this.pCur]!, this.sharks, this.deadScan, this.counters, this.census, boids]), [0]);
    p.dispatchWorkgroups(1);
    p.end();
  }

  static readCensus(f: Float32Array): Census {
    return { fish: f[0]!, sharks: f[1]!, plankton: f[2]!, births: f[3]!, eaten: f[4]!, sharkEnergy: f[5]! };
  }

  /** Census now (test hook). */
  async readCensusNow(): Promise<Census> {
    this.prepare(1, this.flock.tick, true);
    const enc = this.device.createCommandEncoder();
    this.encodeCensus(enc);
    this.device.queue.submit([enc.finish()]);
    return EcologyExt.readCensus(new Float32Array(await readBuffer(this.device, this.census, 32)));
  }

  checkpoint(): unknown {
    const enc = this.device.createCommandEncoder({ label: "swarm-eco-checkpoint" });
    const out = [this.life, this.plankton[this.pCur]!, this.sharks, this.counters].map((b) => {
      const c = this.device.createBuffer({ size: b.size, usage: STORAGE(), label: "swarm-eco-save" });
      enc.copyBufferToBuffer(b, 0, c, 0, b.size);
      return c;
    });
    this.device.queue.submit([enc.finish()]);
    return out;
  }

  restore(c: unknown): void {
    const b = c as GPUBuffer[];
    const enc = this.device.createCommandEncoder({ label: "swarm-eco-restore" });
    enc.copyBufferToBuffer(b[0]!, 0, this.life, 0, this.life.size);
    enc.copyBufferToBuffer(b[1]!, 0, this.plankton[0], 0, this.plankton[0].size);
    enc.copyBufferToBuffer(b[2]!, 0, this.sharks, 0, this.sharks.size);
    enc.copyBufferToBuffer(b[3]!, 0, this.counters, 0, this.counters.size);
    this.device.queue.submit([enc.finish()]);
    this.pCur = 0;
  }

  release(c: unknown): void {
    for (const b of c as GPUBuffer[]) b.destroy();
  }

  destroy(): void {
    for (const b of [...this.plankton, this.sharks, this.life, this.keys, this.deadScan, this.bornScan, this.deadList, this.counters, this.census, this.uni]) b.destroy();
    this.sort.destroy();
    this.scanDead.destroy();
    this.scanBorn.destroy();
  }
}
