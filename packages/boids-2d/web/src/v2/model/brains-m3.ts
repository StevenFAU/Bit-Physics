// Swarm — the M3 brains (03-boids-2d.md § The model, "Brains (one kernel
// interface)"): the species matrix (Species Matrix) and the vision-based
// model (Eyes Only). NEW kernels beside the M1 brains (./brains.ts); the gated
// v4 kernel (./kernel.ts) is untouched and still runs Open Water and the gate.
//
// Both keep the determinism design of the v4 kernel and the M1 brains:
//   * the species matrix sums its neighbours as i32 fixed point (2⁻²⁰), per
//     species — the v4 lab's multi-species path summed floats, so its brute
//     force and counting sort could disagree; here they cannot;
//   * the vision model ORs each neighbour's disc into a bit field, and OR is
//     order-independent, so the field — and every force read from it in a
//     fixed bin order — is the same whatever order the neighbours arrive in.
// Noise, where there is any, is a hash of (seed, step, fish id), and the id
// rides along with the memory re-sort. Each brain's uniform starts with the
// M1 brains' 96-byte header (grid, seed, n), so the shared cell-key pass reads
// it unchanged.
//
// A fish's species rides in its Boid's `align` slot (0 … 5), a vision fish's
// heading ψ in the same slot — both travel with the re-sort and the save
// points, and the renderer and the order reduction never read it.

import type { BrainInputs } from "./brains.js";
import { BRAIN_FLOATS, walkers, writeBrainParams } from "./brains.js";
import { WGSL_BOID } from "./kernel.js";
import { VISION_BINS, VISION_WORDS, boundaryTables } from "./vision-cpu.js";

// ---- the species matrix --------------------------------------------------------------

export const MAX_SPECIES = 6;

/** The species matrix: v4's metric Reynolds rule with a signed gain per pair of species. */
export interface SpeciesParams {
  /** Species in the water (2–6). */
  count: number;
  /** Cohesion radius r (alignment 0.72 r, separation 0.3 r), world units. */
  rCoh: number;
  /** Top speed per step (the slowest is 0.42 of it), before each species' multiplier. */
  speed: number;
  /** Separation weight (every fish keeps its distance from every other). */
  wSep: number;
  /** Angular noise η ∈ [0, 1]. */
  eta: number;
  /** Steer towards (+) or away from (−): row = the fish's species, column = its neighbour's; 6 × 6, row-major. */
  gc: number[];
  /** Match heading (+) or swim against (−); 6 × 6, row-major. */
  ga: number[];
  /** Top-speed multiplier per species. */
  spd: number[];
  /** Share of the fish per species (the first `count` sum to 1). */
  frac: number[];
}

export type SpeciesPreset = "cycle" | "predator" | "segregate" | "mixed";

export const SPECIES_PRESETS: readonly { id: SpeciesPreset; label: string; blurb: string }[] = [
  { id: "cycle", label: "Rock–paper–scissors", blurb: "Each kind chases the next and flees the one before." },
  { id: "predator", label: "Predator and prey", blurb: "A few fast hunters chase a big school that flees them." },
  { id: "segregate", label: "Keep apart", blurb: "Each kind schools with its own and avoids the rest." },
  { id: "mixed", label: "All together", blurb: "Every kind is drawn to every other: one mixed school." },
];

/** Open Water's rule (v4's flock preset), the base of every species. */
export const SPECIES_BASE = { rCoh: 0.105, speed: 0.0065, wSep: 1.6, wCoh: 0.9, wAli: 1.1, eta: 0 } as const;

/**
 * The v4 lab's species presets (index.html speciesConfig), for 2–6 species:
 * each species flocks within itself (cohesion w_coh, alignment w_ali on the
 * diagonal) and the preset sets the cross terms.
 */
export function speciesPreset(preset: SpeciesPreset, count: number, base = SPECIES_BASE): SpeciesParams {
  const n = Math.max(2, Math.min(MAX_SPECIES, Math.round(count)));
  const gc = new Array<number>(36).fill(0);
  const ga = new Array<number>(36).fill(0);
  const spd = new Array<number>(MAX_SPECIES).fill(1);
  const frac = new Array<number>(MAX_SPECIES).fill(0);
  for (let i = 0; i < n; i += 1) frac[i] = 1 / n;
  for (let i = 0; i < MAX_SPECIES; i += 1) {
    gc[i * 6 + i] = base.wCoh;
    ga[i * 6 + i] = base.wAli;
  }
  if (preset === "segregate") {
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) if (i !== j) gc[i * 6 + j] = -1.6;
  } else if (preset === "mixed") {
    for (let i = 0; i < n; i += 1)
      for (let j = 0; j < n; j += 1)
        if (i !== j) {
          gc[i * 6 + j] = base.wCoh * 0.8;
          ga[i * 6 + j] = base.wAli * 0.7;
        }
  } else if (preset === "cycle") {
    for (let i = 0; i < n; i += 1) {
      gc[i * 6 + i] = 0.6;
      gc[i * 6 + ((i + 1) % n)] = 1.4;
      gc[i * 6 + ((i - 1 + n) % n)] = -1.4;
    }
  } else {
    // species 0 = prey (flock, flee), species 1 = predator (chase, loose, fast, rare); the rest school as prey do
    gc[0] = base.wCoh;
    ga[0] = base.wAli;
    gc[7] = 0.2;
    ga[7] = 0.3;
    for (let i = 0; i < n; i += 1) {
      if (i === 1) continue;
      gc[i * 6 + 1] = -1.8;
      gc[6 + i] = 1.6;
    }
    spd[1] = 1.7;
    const prey = 0.85 / (n - 1);
    for (let i = 0; i < n; i += 1) frac[i] = i === 1 ? 0.15 : prey;
  }
  return { count: n, rCoh: base.rCoh, speed: base.speed, wSep: base.wSep, eta: base.eta, gc, ga, spd, frac };
}

/** Uniform words for the species brain: the 24-word header, gc (36), ga (36), spd (8). */
export const SPECIES_FLOATS = BRAIN_FLOATS + 36 + 36 + 8;
export const SPECIES_BYTES = SPECIES_FLOATS * 4;

// ---- the vision model ----------------------------------------------------------------

/** Eyes Only's brain: Bastien & Romanczuk 2020's minimal vision model (./vision-cpu.ts). */
export interface VisionBrainParams {
  /** Body radius R (a fish is a disc of diameter BL = 2R). */
  R: number;
  /** Preferred speed v₀ per unit time (also the starting speeds' scale). */
  speed: number;
  gamma: number;
  a0: number;
  a1: number;
  b0: number;
  b1: number;
  /** Time per step. */
  dt: number;
  /** How far a fish sees. */
  range: number;
}

/** Uniform words for the vision brain: the header plus 8 words of the model and 4 of control. */
export const VISION_FLOATS = BRAIN_FLOATS + 8;
export const VISION_BYTES = VISION_FLOATS * 4;
/** Words in the retina record: the field (8), the four integrals, edges, slot, covered bins, step. */
export const RETINA_HEADER = 16;
/** No fish watched. */
export const NO_WATCH = 0xffffffff;

export interface M3Inputs extends BrainInputs {
  /** Vision: the fish id whose field to record (NO_WATCH = none), dump every field, the step. */
  watch?: number;
  dumpAll?: boolean;
}

/** Fill one step's uniform for an M3 brain (the header via writeBrainParams, then the brain's own words). */
export function writeM3Params(buf: ArrayBuffer, byteOffset: number, o: M3Inputs): void {
  const b = o.brain;
  if (b.kind === "species") {
    writeBrainParams(buf, byteOffset, o);
    const f = new Float32Array(buf, byteOffset, SPECIES_FLOATS);
    const p = b.p;
    f.fill(0, BRAIN_FLOATS);
    const rSep = p.rCoh * 0.3;
    const rAli = p.rCoh * 0.72;
    f[6] = p.speed;
    f[7] = p.eta;
    f[8] = rSep * rSep;
    f[9] = rAli * rAli;
    f[10] = p.rCoh * p.rCoh;
    f[12] = p.speed * 0.14;
    f[13] = p.count;
    f[20] = p.wSep;
    f[21] = rSep;
    f[22] = p.speed * 0.42;
    for (let k = 0; k < 36; k += 1) {
      f[BRAIN_FLOATS + k] = p.gc[k] ?? 0;
      f[BRAIN_FLOATS + 36 + k] = p.ga[k] ?? 0;
    }
    for (let k = 0; k < MAX_SPECIES; k += 1) f[BRAIN_FLOATS + 72 + k] = p.spd[k] ?? 1;
    return;
  }
  if (b.kind === "vision") {
    writeBrainParams(buf, byteOffset, o);
    const f = new Float32Array(buf, byteOffset, VISION_FLOATS);
    const u = new Uint32Array(buf, byteOffset, VISION_FLOATS);
    const p = b.p;
    f[6] = p.speed;
    f[8] = p.range * p.range;
    f[20] = p.R;
    f[21] = p.gamma;
    f[22] = p.a0;
    f[23] = p.a1;
    f[24] = p.b0;
    f[25] = p.b1;
    f[26] = p.dt;
    f[27] = 0;
    u[28] = (o.watch ?? NO_WATCH) >>> 0;
    u[29] = o.dumpAll ? 1 : 0;
    u[30] = o.step >>> 0;
    u[31] = 0;
    return;
  }
  throw new Error(`not an M3 brain: ${b.kind}`);
}

/** The bin-boundary sin/cos table (f64-computed, stored f32): 128 × vec4 (sin φ₂ₘ, cos φ₂ₘ, sin φ₂ₘ₊₁, cos φ₂ₘ₊₁). */
export function visionTable(): Float32Array<ArrayBuffer> {
  const t = boundaryTables(VISION_BINS);
  const out = new Float32Array(VISION_BINS * 2);
  for (let k = 0; k < VISION_BINS; k += 1) {
    out[k * 2] = t.sin[k]!;
    out[k * 2 + 1] = t.cos[k]!;
  }
  return out;
}

// ---- WGSL -------------------------------------------------------------------------------

/** The helpers every brain uses (the same as ./brains.ts's, for a uniform named B). */
const HELPERS = `
const PI: f32 = 3.14159265358979;
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
fn rnd(id: u32, k: u32) -> f32 { return f32(hashU((id * 0x9e3779b1u) ^ hashU(B.frameSeed + k * 0x68e31da4u)) >> 8u) / 16777216.0; }
fn unitOf(v: vec2<f32>, fallback: vec2<f32>) -> vec2<f32> { let l = length(v); return select(fallback, v / l, l > 1e-12); }
fn rot(v: vec2<f32>, a: f32) -> vec2<f32> { let c = cos(a); let s = sin(a); return vec2<f32>(v.x * c - v.y * s, v.x * s + v.y * c); }
fn limitV(v: vec2<f32>, m: f32) -> vec2<f32> { let l = length(v); if (l > m) { return v / l * m; } return v; }
fn cellXY(p: vec2<f32>) -> vec2<i32> {
  return vec2<i32>(i32(clamp(floor((p.x + B.halfW) / B.cellX), 0.0, B.gridCols - 1.0)),
                   i32(clamp(floor((p.y + B.halfH) / B.cellY), 0.0, B.gridRows - 1.0)));
}
`;

const BINDINGS = `
@group(0) @binding(1) var<storage, read> inB: array<Boid>;
@group(0) @binding(2) var<storage, read_write> outB: array<Boid>;
@group(0) @binding(3) var<storage, read> ids: array<u32>;
@group(0) @binding(4) var<storage, read_write> diag: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read> cellStart: array<u32>;
@group(0) @binding(6) var<storage, read> order: array<u32>;
`;

// ---- species: separation shared; cohesion and alignment summed per species, signed gains ----
const SPECIES_STATE = `
  let si = min(u32(max(me.align, 0.0)), 5u);
  let v = me.vel;
  var sepX: i32 = 0; var sepY: i32 = 0; var nSep: u32 = 0u;
  var cX: array<i32, 6>; var cY: array<i32, 6>; var aX: array<i32, 6>; var aY: array<i32, 6>;
  var nC: array<u32, 6>; var nA: array<u32, 6>;
  for (var b = 0u; b < 6u; b = b + 1u) { cX[b] = 0; cY[b] = 0; aX[b] = 0; aY[b] = 0; nC[b] = 0u; nA[b] = 0u; }`;
const SPECIES_ACCUM = `
        let sj = min(u32(max(inB[j].align, 0.0)), 5u);
        if (d2 < B.rCoh2) { cX[sj] = cX[sj] + i32(round(d.x * FP)); cY[sj] = cY[sj] + i32(round(d.y * FP)); nC[sj] = nC[sj] + 1u; }
        if (d2 < B.rAli2) { aX[sj] = aX[sj] + i32(round(inB[j].vel.x * FP)); aY[sj] = aY[sj] + i32(round(inB[j].vel.y * FP)); nA[sj] = nA[sj] + 1u; }
        if (d2 < B.rSep2 && d2 > 1e-9) { let dist = sqrt(d2); let w = (1.0 - dist / B.rSep) / dist; sepX = sepX - i32(round(d.x * w * FP)); sepY = sepY - i32(round(d.y * w * FP)); nSep = nSep + 1u; }`;
const SPECIES_INTEGRATE = `
  if (nSep > 2000u) { atomicOr(&diag[0], 1u); }
  let mult = B.spd[si >> 2u][si & 3u];
  let ms = B.speed * mult;
  let mns = B.minSpeed * mult;
  var acc = vec2<f32>(0.0, 0.0);
  let sep = vec2<f32>(f32(sepX), f32(sepY)) / FP;
  if (length(sep) > 1e-6) { acc = acc + limitV(normalize(sep) * B.speed - v, B.maxForce) * B.wSep; }
  let ns = min(u32(B.count), 6u);
  var nAll: u32 = 0u;
  for (var b = 0u; b < ns; b = b + 1u) {
    let k = si * 6u + b;
    let a = vec2<f32>(f32(aX[b]), f32(aY[b]));
    if (nA[b] > 0u && (aX[b] != 0 || aY[b] != 0)) { acc = acc + limitV(normalize(a) * ms - v, B.maxForce) * B.ga[k >> 2u][k & 3u]; }
    let c = vec2<f32>(f32(cX[b]), f32(cY[b]));
    if (nC[b] > 0u && (cX[b] != 0 || cY[b] != 0)) { acc = acc + limitV(normalize(c) * ms - v, B.maxForce) * B.gc[k >> 2u][k & 3u]; }
    if (nC[b] > 2000u) { atomicOr(&diag[0], 1u); }
    nAll = nAll + nC[b];
  }
  var nv = v + acc;
  let sp = length(nv);
  if (sp > ms) { nv = nv / sp * ms; }
  else if (sp > 1e-6 && sp < mns) { nv = nv / sp * mns; }
  else if (sp <= 1e-6) { nv = vec2<f32>(mns, 0.0); }
  if (B.eta > 0.0) { nv = rot(nv, (rnd(ids[i], 0u) * 2.0 - 1.0) * B.eta * PI); }
  outB[i].pos = fin2(wrapP(p + nv));
  outB[i].vel = fin2(nv);
  outB[i].align = f32(si);
  // the share of its neighbours that are its own kind (the mixing instrument reads it)
  outB[i].dens = select(1.0, f32(nC[si]) / f32(nAll), nAll > 0u);`;

export const WGSL_SPECIES = `
${WGSL_BOID}
struct SP {
  halfW: f32, halfH: f32, gridCols: f32, gridRows: f32,
  cellX: f32, cellY: f32, speed: f32, eta: f32,
  rSep2: f32, rAli2: f32, rCoh2: f32, _f: f32,
  maxForce: f32, count: f32, frameSeed: u32, n: u32,
  fearX: f32, fearY: f32, fearR: f32, fearStr: f32,
  wSep: f32, rSep: f32, minSpeed: f32, _g: f32,
  gc: array<vec4<f32>, 9>,
  ga: array<vec4<f32>, 9>,
  spd: array<vec4<f32>, 2>,
};
@group(0) @binding(0) var<uniform> B: SP;
${BINDINGS}
const FP: f32 = 1048576.0;
${HELPERS}
${walkers("species", SPECIES_STATE, SPECIES_ACCUM, SPECIES_INTEGRATE)}
`;

// ---- vision: the binary visual field as 256 bits; body and edge terms from its transitions ----
const VISION_STATE = `
  let psi = me.align;
  let hd = vec2<f32>(cos(psi), sin(psi));
  var V: array<u32, 8>;
  for (var w = 0u; w < 8u; w = w + 1u) { V[w] = 0u; }`;
const VISION_ACCUM = `
        if (d2 < B.range2) {
          let dist = sqrt(d2);
          let fx = dot(d, hd);
          let fy = d.y * hd.x - d.x * hd.y;
          let th = atan2(fy, fx);
          let dl = asin(min(B.R / max(dist, 1e-12), 1.0));
          var lo = i32(ceil((th - dl + PI) / BW - 0.5));
          var hi = i32(floor((th + dl + PI) / BW - 0.5));
          if (hi < lo) { lo = i32(floor((th + PI) / BW)); hi = lo; }
          setRange(&V, lo, hi);
        }`;
const VISION_INTEGRATE = `
  var bc = 0.0; var bs = 0.0; var ec = 0.0; var es = 0.0;
  var edges = 0u; var cover = 0u;
  for (var w = 0u; w < 8u; w = w + 1u) {
    let cur = V[w];
    // bit k of 'before' is bin k − 1 (the previous word's top bit wraps in)
    let before = (cur << 1u) | (V[(w + 7u) % 8u] >> 31u);
    var t = cur ^ before;
    cover = cover + countOneBits(cur);
    loop {
      if (t == 0u) { break; }
      let b = firstTrailingBit(t);
      t = t & (t - 1u);
      let k = w * 32u + b;
      let q = TAB.k[k >> 1u];
      let odd = (k & 1u) == 1u;
      let s = select(q.x, q.z, odd);
      let c = select(q.y, q.w, odd);
      if (((cur >> b) & 1u) == 1u) { bc = bc - s; bs = bs + c; } else { bc = bc + s; bs = bs - c; }
      ec = ec + c;
      es = es + s;
      edges = edges + 1u;
    }
  }
  // signed speed (the authors' code lets it go negative) and the Euler step
  let v = dot(me.vel, hd) / B.dt;
  let nv = v + B.dt * (B.gamma * (B.v0 - v) + B.a0 * (-bc + B.a1 * ec));
  var npsi = psi + B.dt * B.b0 * (-bs + B.b1 * es);
  if (npsi > PI) { npsi = npsi - 2.0 * PI; } else if (npsi < -PI) { npsi = npsi + 2.0 * PI; }
  let mv = vec2<f32>(cos(npsi), sin(npsi)) * (nv * B.dt);
  outB[i].pos = fin2(wrapP(p + mv));
  outB[i].vel = fin2(mv);
  outB[i].align = fin(npsi);
  outB[i].dens = f32(cover) / 256.0;
  if (ids[i] == B.watch) {
    for (var w = 0u; w < 8u; w = w + 1u) { retina[w] = V[w]; }
    retina[8] = bitcast<u32>(bc); retina[9] = bitcast<u32>(bs); retina[10] = bitcast<u32>(ec); retina[11] = bitcast<u32>(es);
    retina[12] = edges; retina[13] = i; retina[14] = cover; retina[15] = B.step;
  }
  if (B.dumpAll != 0u) {
    for (var w = 0u; w < 8u; w = w + 1u) { retina[${RETINA_HEADER}u + i * 8u + w] = V[w]; }
  }`;

export const WGSL_VISION = `
${WGSL_BOID}
struct VP {
  halfW: f32, halfH: f32, gridCols: f32, gridRows: f32,
  cellX: f32, cellY: f32, v0: f32, _e: f32,
  range2: f32, _f1: f32, _f2: f32, _f3: f32,
  _m: f32, _a: f32, frameSeed: u32, n: u32,
  fearX: f32, fearY: f32, fearR: f32, fearStr: f32,
  R: f32, gamma: f32, a0: f32, a1: f32,
  b0: f32, b1: f32, dt: f32, _h: f32,
  watch: u32, dumpAll: u32, step: u32, _j: u32,
};
struct Table { k: array<vec4<f32>, ${VISION_BINS / 2}> };
@group(0) @binding(0) var<uniform> B: VP;
${BINDINGS}
@group(0) @binding(8) var<uniform> TAB: Table;
@group(0) @binding(9) var<storage, read_write> retina: array<u32>;
const BW: f32 = 6.28318530717959 / ${VISION_BINS}.0;
${HELPERS}
// set bins lo..hi (unwrapped, lo <= hi) of a ${VISION_BINS}-bin field
fn setRange(V: ptr<function, array<u32, ${VISION_WORDS}>>, lo0: i32, hi0: i32) {
  let len = hi0 - lo0 + 1;
  if (len >= ${VISION_BINS}) {
    for (var w = 0u; w < ${VISION_WORDS}u; w = w + 1u) { (*V)[w] = 0xffffffffu; }
    return;
  }
  var k = ((lo0 % ${VISION_BINS}) + ${VISION_BINS}) % ${VISION_BINS};
  var rem = len;
  loop {
    if (rem <= 0) { break; }
    let w = u32(k) >> 5u;
    let b = u32(k) & 31u;
    let take = min(rem, 32 - i32(b));
    var mask = 0xffffffffu;
    if (take < 32) { mask = ((1u << u32(take)) - 1u) << b; }
    (*V)[w] = (*V)[w] | mask;
    rem = rem - take;
    k = (k + take) % ${VISION_BINS};
  }
}
${walkers("vision", VISION_STATE, VISION_ACCUM, VISION_INTEGRATE)}
`;
