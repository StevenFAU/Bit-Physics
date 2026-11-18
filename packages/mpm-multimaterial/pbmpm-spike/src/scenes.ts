// scenes.ts — materials, standard per-material tests, the Table scene and the
// kinematic hammer / press scripts for the PB-MPM spike.
//
// World units are metres, y up, table top at y = 0. A scene is seeded on the
// grid of the run's tier: dx = 2.56 m / grid.x (T3 128 -> 2 cm), 8 particles per
// cell (2 per axis, jittered), the reference default.

import { FLOATS_PER_PARTICLE, MODEL, type ColliderState, type Mat } from "./pbmpm.js";

export const DOMAIN_X = 2.56; // metres; the grid is grid.x x grid.x/2 x grid.x cells
export const G = 9.81;

const deg = (d: number) => (d * Math.PI) / 180;
/** Klár 2016 cone coefficient (the reference's 2D formula is the same). */
export function dpAlpha(phiDeg: number): number {
  const s = Math.sin(deg(phiDeg));
  return Math.sqrt(2 / 3) * ((2 * s) / (3 - s));
}

const base: Mat = {
  model: 0,
  stiffness: 1.5,
  ratio: 1,
  viscosity: 0,
  relaxVol: 1.5,
  yieldR: 1,
  thetaC: 0,
  thetaS: 0,
  xi: 0,
  dpAlpha: 0,
  lamOverMu: 1,
  maxStiffness: 1.5,
  density: 1,
  color: [1, 1, 1],
};

/** Defaults: reference values where the reference has the material. */
export function defaultMaterials(): Record<string, Mat> {
  return {
    water: { ...base, model: MODEL.water, viscosity: 0.01, relaxVol: 1.5, density: 1.0, color: [0.22, 0.48, 0.85] },
    jelly: { ...base, model: MODEL.jelly, stiffness: 1.0, ratio: 1, density: 1.1, color: [0.92, 0.3, 0.42] },
    // relaxVol 0: the reference form (resist compression only); > 0.5: the full
    // elastic target R (friction angle governs, spurious cohesion at phi >= 35).
    sand: { ...base, model: MODEL.sand, stiffness: 1.5, ratio: 1, viscosity: 0.01, relaxVol: 0, dpAlpha: dpAlpha(35), lamOverMu: 1, density: 1.6, color: [0.86, 0.7, 0.44] },
    // lamOverMu 0: Stomakhin hardening on the constraint stiffness (fails: see
    // the M0 note); 1: hardening on the critical strains (the M0 default).
    snow: { ...base, model: MODEL.snow, stiffness: 1.0, ratio: 1, thetaC: 0.025, thetaS: 0.0075, xi: 10, lamOverMu: 1, maxStiffness: 1.5, density: 0.4, color: [0.95, 0.97, 1.0] },
    clay: { ...base, model: MODEL.clay, stiffness: 1.0, ratio: 1, yieldR: 0.1, density: 1.8, color: [0.74, 0.42, 0.3] },
    honey: { ...base, model: MODEL.honey, stiffness: 1.5, ratio: 0.3, yieldR: 0.1, density: 1.4, color: [0.96, 0.62, 0.12] },
    // Fallback: v1 snow verbatim (gen-verification.mjs: E 5e4, nu 0.2, rho 400,
    // thetaC 2.5e-2, thetaS 7.5e-3, xi 10). yieldR = mu0, dpAlpha = lam0 (Pa);
    // relaxVol (stress scale) is set per run from dt and dx.
    snowmls: { ...base, model: MODEL.snowmls, yieldR: 5e4 / (2 * 1.2), dpAlpha: (5e4 * 0.2) / (1.2 * 0.6), thetaC: 0.025, thetaS: 0.0075, xi: 10, density: 0.4, color: [0.9, 0.95, 1.0] },
  };
}

export const MAT_ORDER = ["water", "jelly", "sand", "snow", "clay", "honey", "snowmls"] as const;
export type MatName = (typeof MAT_ORDER)[number];

export interface Block {
  shape: "box" | "sphere" | "cylinder";
  mat: MatName;
  /** box: min corner; sphere/cylinder: centre of the base (cyl) or centre (sphere) */
  at: [number, number, number];
  size?: [number, number, number]; // box
  radius?: number;
  height?: number; // cylinder
  vel?: [number, number, number]; // m/s
}

export interface Emitter {
  mat: MatName;
  at: [number, number, number]; // nozzle centre (m)
  radius: number;
  speed: number; // m/s downward
  t0: number;
  t1: number;
}

export interface Waypoint {
  t: number;
  p: [number, number, number];
}

export interface Script {
  kind: 1 | 2;
  radius: number;
  half?: [number, number, number];
  friction: number;
  path: Waypoint[];
}

export interface Scene {
  id: string;
  blocks: Block[];
  emitters?: Emitter[];
  scripts?: Script[];
  camera: { target: [number, number, number]; yaw: number; pitch: number; dist: number };
  duration: number;
}

export interface Seeded {
  data: Float32Array;
  count: number;
  dx: number;
  matIds: string[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** m -> cells (table top at y = 0 m sits on the guardian floor). */
export function toCells(p: [number, number, number], dx: number, guard: number): [number, number, number] {
  return [p[0] / dx, p[1] / dx + guard, p[2] / dx];
}

function inside(b: Block, x: number, y: number, z: number): boolean {
  if (b.shape === "box") {
    const s = b.size ?? [0.1, 0.1, 0.1];
    return x >= b.at[0] && x < b.at[0] + s[0] && y >= b.at[1] && y < b.at[1] + s[1] && z >= b.at[2] && z < b.at[2] + s[2];
  }
  if (b.shape === "sphere") {
    const r = b.radius ?? 0.1;
    return (x - b.at[0]) ** 2 + (y - b.at[1]) ** 2 + (z - b.at[2]) ** 2 < r * r;
  }
  const r = b.radius ?? 0.1;
  const h = b.height ?? 0.1;
  return (x - b.at[0]) ** 2 + (z - b.at[2]) ** 2 < r * r && y >= b.at[1] && y < b.at[1] + h;
}

function bounds(b: Block): [number[], number[]] {
  if (b.shape === "box") {
    const s = b.size ?? [0.1, 0.1, 0.1];
    return [[...b.at], [b.at[0] + s[0], b.at[1] + s[1], b.at[2] + s[2]]];
  }
  const r = b.radius ?? 0.1;
  if (b.shape === "sphere") return [[b.at[0] - r, b.at[1] - r, b.at[2] - r], [b.at[0] + r, b.at[1] + r, b.at[2] + r]];
  return [[b.at[0] - r, b.at[1], b.at[2] - r], [b.at[0] + r, b.at[1] + (b.height ?? 0.1), b.at[2] + r]];
}

function pack(out: Float32Array, i: number, pos: number[], disp: number[], mass: number, mat: number, tOn: number): void {
  const o = i * FLOATS_PER_PARTICLE;
  out[o + 0] = pos[0];
  out[o + 1] = pos[1];
  out[o + 2] = pos[2];
  new Uint32Array(out.buffer, out.byteOffset)[o + 3] = mat;
  out[o + 4] = disp[0];
  out[o + 5] = disp[1];
  out[o + 6] = disp[2];
  out[o + 7] = mass;
  // F = I (columns vec4-strided at 8, 12, 16); D = 0 (20..31)
  out[o + 8] = 1;
  out[o + 13] = 1;
  out[o + 18] = 1;
  out[o + 32] = 1; // jp
  out[o + 33] = 0; // logjp
  out[o + 34] = tOn;
  out[o + 35] = 0; // aux
}

/**
 * Seed a scene for grid.x cells across DOMAIN_X. `dt` converts initial
 * velocities to the per-step displacement the solver carries.
 */
export function seed(scene: Scene, gridX: number, guard: number, dt: number, mats: Record<string, Mat>, maxCount: number, ppcAxis = 2): Seeded {
  const dx = DOMAIN_X / gridX;
  const h = dx / ppcAxis;
  const matIds: string[] = [...MAT_ORDER];
  const rng = mulberry32(0x5eed);
  const out = new Float32Array(maxCount * FLOATS_PER_PARTICLE);
  let n = 0;
  const gStep = (G / dx) * dt * dt;
  for (const b of scene.blocks) {
    const [lo, hi] = bounds(b);
    const mid = matIds.indexOf(b.mat);
    const mass = mats[b.mat].density * ppcAxis ** -3;
    const v = b.vel ?? [0, 0, 0];
    const disp = [(v[0] / dx) * dt, (v[1] / dx) * dt - gStep, (v[2] / dx) * dt];
    // lattice aligned to h so neighbouring blocks interleave cleanly
    for (let x = Math.floor(lo[0] / h) * h + h / 2; x < hi[0]; x += h) {
      for (let y = Math.floor(lo[1] / h) * h + h / 2; y < hi[1]; y += h) {
        for (let z = Math.floor(lo[2] / h) * h + h / 2; z < hi[2]; z += h) {
          if (!inside(b, x, y, z)) continue;
          if (n >= maxCount) throw new Error(`scene ${scene.id} exceeds ${maxCount} particles`);
          const j = () => (rng() - 0.5) * 0.3 * h;
          const c = toCells([x + j(), y + j(), z + j()], dx, guard);
          pack(out, n, c, disp, mass, mid, 0);
          n += 1;
        }
      }
    }
  }
  for (const e of scene.emitters ?? []) {
    const mid = matIds.indexOf(e.mat);
    const mass = mats[e.mat].density * ppcAxis ** -3;
    const vy = -(e.speed / dx) * dt - gStep;
    const slice = h / e.speed; // one lattice spacing of stream per slice
    for (let t = e.t0; t < e.t1; t += slice) {
      // A slice switches on at the first substep start >= t; place it where the
      // stream would be by then so slices that share a substep do not overlap.
      const tq = Math.ceil(t / dt - 1e-9) * dt;
      const y = e.at[1] - e.speed * (tq - t);
      for (let x = -e.radius + h / 2; x < e.radius; x += h) {
        for (let z = -e.radius + h / 2; z < e.radius; z += h) {
          if (x * x + z * z >= e.radius * e.radius) continue;
          if (n >= maxCount) throw new Error(`scene ${scene.id} exceeds ${maxCount} particles`);
          const c = toCells([e.at[0] + x, y, e.at[2] + z], dx, guard);
          pack(out, n, c, [0, vy, 0], mass, mid, tq);
          n += 1;
        }
      }
    }
  }
  return { data: out.subarray(0, n * FLOATS_PER_PARTICLE), count: n, dx, matIds };
}

/**
 * Reorder particles in place: "shuffle" (deterministic Fisher–Yates) spreads a
 * wave's 64 particles over the domain; "morton" sorts by the 4^3 brick of the
 * cell (Morton order of bricks, lattice order inside), the order a counting
 * sort by brick would give. Emitted particles keep their order (t_on).
 */
export function reorder(s: Seeded, mode: "lattice" | "shuffle" | "morton" | "interleave"): void {
  if (mode === "lattice") return;
  const F = FLOATS_PER_PARTICLE;
  const n = s.count;
  const idx = Array.from({ length: n }, (_, i) => i);
  if (mode === "shuffle") {
    const rng = mulberry32(0xb0b);
    for (let i = n - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
  } else {
    const part = (v: number) => {
      let x = v & 0x3ff;
      x = (x | (x << 16)) & 0x030000ff;
      x = (x | (x << 8)) & 0x0300f00f;
      x = (x | (x << 4)) & 0x030c30c3;
      x = (x | (x << 2)) & 0x09249249;
      return x;
    };
    // "interleave": inside a brick, order by (rank of the particle within its
    // cell, cell) so a wave's consecutive lanes sit in different cells and a
    // scatter instruction hits different nodes (fewer atomic conflicts).
    const key = new Float64Array(n);
    const rank = new Map<number, number>();
    for (let i = 0; i < n; i += 1) {
      const o = i * F;
      const cx = Math.floor(s.data[o]);
      const cy = Math.floor(s.data[o + 1]);
      const cz = Math.floor(s.data[o + 2]);
      const bx = cx >> 2;
      const by = cy >> 2;
      const bz = cz >> 2;
      let inner = s.data[o + 34] > 0 ? 1 << 20 : 0;
      if (mode === "interleave") {
        const cell = (cz * 1024 + cy) * 1024 + cx;
        const r = rank.get(cell) ?? 0;
        rank.set(cell, r + 1);
        inner += r * 64 + ((cz & 3) * 16 + (cy & 3) * 4 + (cx & 3));
      }
      key[i] = (part(bx) | (part(by) << 1) | (part(bz) << 2)) * (1 << 22) + inner;
    }
    idx.sort((a, b) => key[a] - key[b] || a - b);
  }
  const copy = s.data.slice();
  for (let i = 0; i < n; i += 1) s.data.set(copy.subarray(idx[i] * F, idx[i] * F + F), i * F);
}

function lerpPath(path: Waypoint[], t: number): [number, number, number] | null {
  if (path.length === 0 || t < path[0].t || t > path[path.length - 1].t) return null;
  for (let i = 0; i + 1 < path.length; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
      return [a.p[0] + u * (b.p[0] - a.p[0]), a.p[1] + u * (b.p[1] - a.p[1]), a.p[2] + u * (b.p[2] - a.p[2])];
    }
  }
  return null;
}

/** Collider states (cells) for the step [t, t + dt]. */
export function colliderStates(scene: Scene, t: number, dt: number, dx: number, guard: number): ColliderState[] {
  const out: ColliderState[] = [];
  for (const s of scene.scripts ?? []) {
    const p1 = lerpPath(s.path, t + dt);
    const p0 = lerpPath(s.path, t) ?? p1;
    if (!p1 || !p0) continue;
    const c1 = toCells(p1, dx, guard);
    const c0 = toCells(p0, dx, guard);
    out.push({
      kind: s.kind,
      friction: s.friction,
      radius: s.radius / dx,
      center: c1,
      half: s.half ? [s.half[0] / dx, s.half[1] / dx, s.half[2] / dx] : [0, 0, 0],
      disp: [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]],
    });
  }
  return out;
}

/**
 * The violent hammer: a 12 cm-radius sphere entering at full speed (no ramp),
 * sweeping through the target and straight back, then smashing down onto it.
 */
export function hammerScript(target: [number, number, number], height: number, speed: number, t0: number, reach = 0.7): Script {
  const r = 0.12;
  const y = Math.max(height, r + 0.01);
  const a: [number, number, number] = [target[0] - reach, y, target[2]];
  const b: [number, number, number] = [target[0] + reach, y, target[2]];
  const sweep = (2 * reach) / speed;
  const top: [number, number, number] = [target[0], 0.9, target[2]];
  const down: [number, number, number] = [target[0], r + 0.005, target[2]];
  const drop = (0.9 - (r + 0.005)) / speed;
  return {
    kind: 1,
    radius: r,
    friction: 0.3,
    path: [
      { t: t0, p: a },
      { t: t0 + sweep, p: b },
      { t: t0 + 2 * sweep, p: a },
      { t: t0 + 2 * sweep + 0.05, p: top },
      { t: t0 + 2 * sweep + 0.05 + drop, p: down },
      { t: t0 + 2 * sweep + 0.25 + drop, p: down },
      { t: t0 + 2 * sweep + 0.25 + 2 * drop, p: top },
    ],
  };
}

export function hammerEnd(s: Script): number {
  return s.path[s.path.length - 1].t;
}

const C = DOMAIN_X / 2;

export function sceneById(id: string, opts: { hammer?: boolean; hammerSpeed?: number; hammerAt?: number; mat?: MatName; y0?: number; scale?: number } = {}): Scene {
  const hs = opts.hammerSpeed ?? 8;
  const ht = opts.hammerAt ?? 1.5;
  let sc: Scene;
  switch (id) {
    case "dam":
      sc = {
        id,
        blocks: [{ shape: "box", mat: opts.mat ?? "water", at: [0.08, 0, 0.08], size: [0.5, 0.64, 0.64] }],
        camera: { target: [C * 0.8, 0.15, C * 0.8], yaw: 0.55, pitch: 0.55, dist: 3.4 },
        duration: 3,
      };
      if (opts.hammer) sc.scripts = [hammerScript([0.9, 0, 0.6], 0.12, hs, ht, 0.8)];
      return sc;
    case "sandcol":
      sc = {
        id,
        blocks: [{ shape: "cylinder", mat: opts.mat ?? "sand", at: [C, 0, C], radius: 0.36 * (opts.scale ?? 1), height: 0.36 * (opts.scale ?? 1) }],
        camera: { target: [C, 0.1, C], yaw: 0.6, pitch: 0.45, dist: 2.6 },
        duration: 4,
      };
      if (opts.hammer) sc.scripts = [hammerScript([C, 0, C], 0.12, hs, ht, 1.0)];
      return sc;
    case "jelly":
      sc = {
        id,
        blocks: [{ shape: "box", mat: opts.mat ?? "jelly", at: [C - 0.16, opts.y0 ?? 0.4, C - 0.16], size: [0.32, 0.32, 0.32] }],
        camera: { target: [C, 0.25, C], yaw: 0.6, pitch: 0.35, dist: 2.4 },
        duration: 3,
      };
      if (opts.hammer) sc.scripts = [hammerScript([C, 0, C], 0.16, hs, ht, 0.7)];
      return sc;
    case "snowball":
      sc = {
        id,
        blocks: [
          { shape: "box", mat: opts.mat ?? "snow", at: [C + 0.2, 0, C - 0.4], size: [0.16, 0.48, 0.8] },
          { shape: "sphere", mat: opts.mat ?? "snow", at: [C - 0.6, 0.3, C], radius: 0.14, vel: [6, 1.2, 0] },
        ],
        camera: { target: [C, 0.2, C], yaw: 1.0, pitch: 0.35, dist: 2.6 },
        duration: 2,
      };
      if (opts.hammer) sc.scripts = [hammerScript([C + 0.28, 0, C], 0.2, hs, ht, 0.8)];
      return sc;
    case "press": {
      const mat = opts.mat ?? "clay";
      const hgt = 0.32;
      const plate = 0.08; // half thickness
      const top = hgt + plate + 0.04;
      const low = hgt * 0.5 + plate;
      const v = 0.6;
      const t1 = 0.3 + (top - low) / v;
      sc = {
        id,
        blocks: [{ shape: "box", mat, at: [C - 0.24, 0, C - 0.24], size: [0.48, hgt, 0.48] }],
        scripts: [
          {
            kind: 2,
            radius: 0.01,
            half: [0.4, plate, 0.4],
            friction: 0.5,
            path: [
              { t: 0, p: [C, top, C] },
              { t: 0.3, p: [C, top, C] },
              { t: t1, p: [C, low, C] },
              { t: t1 + 0.3, p: [C, low, C] },
              { t: t1 + 0.3 + (0.9 - low) / v, p: [C, 0.9, C] },
            ],
          },
        ],
        camera: { target: [C, 0.15, C], yaw: 0.6, pitch: 0.4, dist: 2.4 },
        duration: t1 + 0.3 + (0.9 - low) / v + 1.0,
      };
      return sc;
    }
    case "honeycol":
      sc = {
        id,
        blocks: [{ shape: "cylinder", mat: opts.mat ?? "honey", at: [C, 0, C], radius: 0.16, height: 0.64 }],
        camera: { target: [C, 0.2, C], yaw: 0.6, pitch: 0.35, dist: 2.4 },
        duration: 4,
      };
      if (opts.hammer) sc.scripts = [hammerScript([C, 0, C], 0.12, hs, ht, 0.7)];
      return sc;
    case "honeypour":
      return {
        id,
        blocks: [],
        emitters: [{ mat: opts.mat ?? "honey", at: [C, 0.9, C], radius: 0.05 * (opts.scale ?? 1), speed: 1.0, t0: 0, t1: 3.0 }],
        camera: { target: [C, 0.25, C], yaw: 0.6, pitch: 0.3, dist: 1.8 },
        duration: 4,
      };
    case "table":
    default:
      return tableScene(opts.hammer ? hs : 0, ht, opts.mat === "snowmls" ? "snowmls" : "snow", id === "tablepond");
  }
}

/**
 * The Table (spec "First ten seconds"): sand castle, jelly tower, snowman,
 * a clay figure, a thrown snowball. Sized for ~400k particles at T3.
 */
export function tableScene(hammerSpeed: number, hammerAt: number, snow: MatName = "snow", pond = false): Scene {
  const blocks: Block[] = [];
  if (pond) {
    // bench variant: a shallow water pond brings T3 to ~400k particles
    blocks.push({ shape: "box", mat: "water", at: [0.25, 0, 0.15], size: [0.7, 0.12, 0.8] });
  }
  // sand castle
  const cx = 0.75;
  const cz = 1.1;
  blocks.push({ shape: "box", mat: "sand", at: [cx - 0.36, 0, cz - 0.36], size: [0.72, 0.2, 0.72] });
  blocks.push({ shape: "cylinder", mat: "sand", at: [cx, 0.2, cz], radius: 0.15, height: 0.22 });
  for (const [ox, oz] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]]) {
    blocks.push({ shape: "cylinder", mat: "sand", at: [cx + ox, 0.2, cz + oz], radius: 0.08, height: 0.14 });
  }
  // jelly tower: three stacked cubes
  const jx = 1.75;
  const jz = 0.85;
  for (let k = 0; k < 3; k += 1) {
    blocks.push({ shape: "box", mat: "jelly", at: [jx - 0.15, k * 0.3 + 0.005 * k, jz - 0.15], size: [0.3, 0.3, 0.3] });
  }
  // snowman
  const sx = 1.65;
  const sz = 1.75;
  blocks.push({ shape: "sphere", mat: snow, at: [sx, 0.24, sz], radius: 0.24 });
  blocks.push({ shape: "sphere", mat: snow, at: [sx, 0.62, sz], radius: 0.16 });
  blocks.push({ shape: "sphere", mat: snow, at: [sx, 0.87, sz], radius: 0.1 });
  // clay figure
  blocks.push({ shape: "box", mat: "clay", at: [0.6, 0, 1.8], size: [0.3, 0.3, 0.3] });
  // honey puddle-to-be
  blocks.push({ shape: "cylinder", mat: "honey", at: [1.15, 0, 0.45], radius: 0.1, height: 0.3 });
  // snowball, thrown at the castle
  blocks.push({ shape: "sphere", mat: snow, at: [2.2, 0.5, 1.1], radius: 0.1, vel: [-6, 1.5, 0] });
  const sc: Scene = {
    id: "table",
    blocks,
    camera: { target: [1.28, 0.25, 1.28], yaw: 0.45, pitch: 0.5, dist: 3.6 },
    duration: 4,
  };
  if (hammerSpeed > 0) sc.scripts = [hammerScript([1.75, 0, 0.85], 0.2, hammerSpeed, hammerAt, 0.6)];
  return sc;
}

/**
 * Brick work list for the tiled pass: runs of particles sharing a 4^3 brick
 * (the data must be brick-sorted, e.g. reorder(..., "morton")), cut into
 * chunks of <= 256. Each item: first, count, origin x | y << 10 | z << 20, 0.
 */
export function brickWork(s: Seeded): Uint32Array {
  const F = FLOATS_PER_PARTICLE;
  const items: number[] = [];
  let start = 0;
  let key = -1;
  let org = 0;
  const flush = (end: number) => {
    for (let a = start; a < end; a += 256) items.push(a, Math.min(256, end - a), org, 0);
  };
  for (let i = 0; i < s.count; i += 1) {
    const o = i * F;
    const bx = Math.floor(s.data[o] / 4);
    const by = Math.floor(s.data[o + 1] / 4);
    const bz = Math.floor(s.data[o + 2] / 4);
    const k = (bz * 1024 + by) * 1024 + bx;
    if (k !== key) {
      if (key >= 0) flush(i);
      start = i;
      key = k;
      org = (bx * 4) | ((by * 4) << 10) | ((bz * 4) << 20);
    }
  }
  if (key >= 0) flush(s.count);
  return new Uint32Array(items);
}
