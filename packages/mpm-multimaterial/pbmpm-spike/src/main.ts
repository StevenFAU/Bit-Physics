// main.ts — window.spike API for the headless driver (run-spike.mjs). No UI.

import preludeWgsl from "../../src/mpm_prelude.wgsl?raw";
import svdWgsl from "./svdcheck.wgsl?raw";
import { FLOATS_PER_PARTICLE, PbMpm, type Mat, type StepPlan } from "./pbmpm.js";
import { brickWork, colliderStates, defaultMaterials, G, hammerEnd, MAT_ORDER, reorder, sceneById, seed, type Scene } from "./scenes.js";

declare global {
  interface Window {
    spike: unknown;
    __spikeReady: boolean;
    __spikeErrors: string[];
    __shot?: (name: string) => Promise<void>;
  }
}

window.__spikeErrors = [];
const canvas = document.querySelector("canvas") as HTMLCanvasElement;

async function boot() {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("no adapter");
  const feats: GPUFeatureName[] = adapter.features.has("timestamp-query") ? ["timestamp-query"] : [];
  const device = await adapter.requestDevice({ requiredFeatures: feats });
  device.addEventListener("uncapturederror", (e) => {
    const msg = (e as GPUUncapturedErrorEvent).error.message;
    window.__spikeErrors.push(msg);
    console.error(msg);
  });
  const ctx = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });
  const info = adapter.info;
  return { adapter, device, ctx, format, info };
}

const env = await boot();
const sims = new Map<number, PbMpm>();
function sim(gridX: number, maxParticles: number): PbMpm {
  const key = gridX;
  let s = sims.get(key);
  if (!s || s.maxParticles < maxParticles) {
    for (const o of sims.values()) {
      o.particleBuf.destroy();
      o.gridQ.destroy();
      o.gridD.destroy();
    }
    sims.clear();
    s = new PbMpm(env.device, [gridX, gridX / 2, gridX], maxParticles);
    s.initRender(env.format);
    sims.set(key, s);
  }
  return s;
}

interface RunCfg {
  scene: string;
  label?: string;
  gridX?: number;
  substeps: number;
  iterations: number;
  fps?: number; // frames per sim second (default 60)
  duration?: number;
  maxParticles?: number;
  mat?: string;
  mats?: Record<string, Partial<Mat>>;
  hammer?: boolean;
  hammerSpeed?: number;
  hammerAt?: number;
  y0?: number;
  scale?: number;
  wallFriction?: number;
  order?: "lattice" | "shuffle" | "morton" | "interleave";
  /** tiled P2G (shared-memory brick tiles); implies the brick (morton) order */
  tiled?: boolean;
  /** water-only scenes: the SOLIDS = false pipeline (no SVD code compiled) */
  waterOnly?: boolean;
  /** SHA-256 of the particle buffer at the end of the run */
  hash?: boolean;
  statsEvery?: number; // frames
  shotsAt?: number[];
  shotMode?: number;
  metricsAt?: number[];
  occupancyAt?: number[];
  benchAt?: number; // time to run a bench (frames) mid-run
  /** re-bin (readback, brick-sort, re-upload) right before the bench: what a per-frame GPU sort would give */
  resortBeforeBench?: boolean;
  benchFrames?: number;
}

function materialsFor(cfg: RunCfg): Mat[] {
  const d = defaultMaterials();
  for (const [k, v] of Object.entries(cfg.mats ?? {})) d[k] = { ...d[k], ...v };
  return MAT_ORDER.map((k) => d[k]);
}

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

async function run(cfg: RunCfg) {
  const gridX = cfg.gridX ?? 128;
  const fps = cfg.fps ?? 60;
  const dt = 1 / fps / cfg.substeps;
  const scene: Scene = sceneById(cfg.scene, { hammer: cfg.hammer, hammerSpeed: cfg.hammerSpeed, hammerAt: cfg.hammerAt, mat: cfg.mat as never, y0: cfg.y0, scale: cfg.scale });
  const mats = materialsFor(cfg);
  {
    // explicit (fallback) stress scale: 4 dt^2/dx^2 * V0/mass_unit, V0/mass_unit = 1/(ppc * 1000)
    const dxm = 2.56 / gridX;
    const sm = mats[MAT_ORDER.indexOf("snowmls")];
    sm.relaxVol = ((4 * dt * dt) / (dxm * dxm)) * (1 / (8 * 1000));
  }
  const maxP = cfg.maxParticles ?? 1_000_000;
  const s = sim(gridX, Math.min(maxP, 900_000));
  const matRec = Object.fromEntries(MAT_ORDER.map((k, i) => [k, mats[i]]));
  const seeded = seed(scene, gridX, s.guard, dt, matRec, s.maxParticles);
  reorder(seeded, cfg.tiled ? (cfg.order === "interleave" ? "interleave" : "morton") : (cfg.order ?? "lattice"));
  s.setMaterials(mats);
  const gCells = G / seeded.dx;
  const hs = cfg.hammerSpeed ?? 8;
  s.speedThresh = (3 * hs) / seeded.dx;
  s.wallFriction = cfg.wallFriction ?? 0.5;
  s.upload(seeded.data, seeded.count);
  const work = cfg.tiled ? brickWork(seeded) : null;
  s.setWork(work);
  s.waterOnly = cfg.waterOnly ?? false;
  const duration = cfg.duration ?? scene.duration;
  const frames = Math.round(duration * fps);
  const timeline: Record<string, number>[] = [];
  const metrics: Record<string, unknown>[] = [];
  const occupancy: Record<string, unknown>[] = [];
  const shots: string[] = [];
  let bench: unknown = null;
  const hammerT = scene.scripts?.length ? { start: scene.scripts[0].path[0].t, end: hammerEnd(scene.scripts[0]) } : null;
  const plan = (t: number): StepPlan => ({
    substeps: cfg.substeps,
    iterations: cfg.iterations,
    dt,
    gravity: gCells,
    time: t,
    colliders: (_s, t0, h) => colliderStates(scene, t0, h, seeded.dx, s.guard),
  });
  const due = (list: number[] | undefined, t: number) => (list ?? []).some((x) => Math.abs(x - t) < 0.5 / fps);
  let cols = colliderStates(scene, 0, dt, seeded.dx, s.guard);
  const wall0 = performance.now();
  for (let f = 0; f <= frames; f += 1) {
    const t = f / fps;
    if (cfg.statsEvery && f % cfg.statsEvery === 0) {
      const st = await s.stats(t, dt, gCells);
      timeline.push({ t, ...st });
      if (st.nonFinite > 0) {
        window.__spikeErrors.push(`non-finite at t=${t}`);
      }
    }
    if (due(cfg.metricsAt, t)) metrics.push({ t, ...(await measure(s, seeded.dx, t)) });
    if (due(cfg.occupancyAt, t)) occupancy.push({ t, ...(await s.occupancy(t, dt, gCells)) });
    if (due(cfg.shotsAt, t) && window.__shot) {
      s.render(env.ctx, camCells(scene, seeded.dx, s.guard), {
        time: t,
        dt,
        mode: cfg.shotMode ?? 0,
        radius: 0.42, // cells; particle spacing is 0.5
        colliders: cols,
      });
      await s.flush();
      await raf();
      const name = `${cfg.label ?? cfg.scene}-t${t.toFixed(2)}`;
      await window.__shot(name);
      shots.push(name);
    }
    if (cfg.benchAt !== undefined && Math.abs(cfg.benchAt - t) < 0.5 / fps && s.hasTs) {
      if (cfg.resortBeforeBench && cfg.tiled) {
        const d = await s.readParticles();
        const cur = { ...seeded, data: d, count: s.n };
        reorder(cur, cfg.order === "interleave" ? "interleave" : "morton");
        s.upload(cur.data, cur.count);
        s.setWork(brickWork(cur));
        // two untimed back-to-back frames so the GPU clock is up again after the CPU pause
        s.step(plan(t));
        s.step(plan(t + 1 / fps));
      }
      const b1 = await s.bench(plan(t), cfg.benchFrames ?? 30, "frame");
      const b2 = await s.bench(plan(t), cfg.benchFrames ?? 30, "split");
      bench = { t, frame: b1, split: b2 };
      // bench advanced the state by its frames; the rest of the run is not comparable
      break;
    }
    if (f === frames) break;
    cols = s.step(plan(t));
    if (f % 30 === 29) await s.flush();
  }
  await s.flush();
  const wallMs = performance.now() - wall0;
  let hash: string | null = null;
  if (cfg.hash) {
    const d = await s.readParticles();
    const h = await crypto.subtle.digest("SHA-256", new Uint8Array(d.buffer as ArrayBuffer));
    hash = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return {
    adapter: `${env.info.vendor} ${env.info.architecture} ${env.info.description}`.trim(),
    config: cfg,
    n: seeded.count,
    dx: seeded.dx,
    dt,
    gravityCells: gCells,
    grid: s.grid,
    hammer: hammerT,
    workItems: work ? work.length / 4 : 0,
    hash,
    timeline,
    metrics,
    occupancy,
    shots,
    bench,
    wallMs,
    errors: window.__spikeErrors.slice(),
  };
}

function camCells(scene: Scene, dx: number, guard: number) {
  const c = scene.camera;
  return {
    target: [c.target[0] / dx, c.target[1] / dx + guard, c.target[2] / dx] as [number, number, number],
    yaw: c.yaw,
    pitch: c.pitch,
    dist: c.dist / dx,
  };
}

// ---- measurements on a readback ------------------------------------------------

async function measure(s: PbMpm, dx: number, time: number) {
  const d = await s.readParticles();
  const u = new Uint32Array(d.buffer);
  const n = s.n;
  const per: Record<string, { n: number; ySum: number; yMax: number; ys: number[]; detSum: number; jpSum: number; jpLow: number; auxMax: number; xs: number[]; zs: number[] }> = {};
  const g = s.guard;
  for (let i = 0; i < n; i += 1) {
    const o = i * FLOATS_PER_PARTICLE;
    if (d[o + 34] > time) continue; // not emitted yet
    const m = MAT_ORDER[u[o + 3]];
    const r = (per[m] ??= { n: 0, ySum: 0, yMax: -1, ys: [], detSum: 0, jpSum: 0, jpLow: 0, auxMax: 0, xs: [], zs: [] });
    const y = (d[o + 1] - g) * dx;
    r.n += 1;
    r.ySum += y;
    r.yMax = Math.max(r.yMax, y);
    r.ys.push(y);
    r.xs.push(d[o] * dx);
    r.zs.push(d[o + 2] * dx);
    // F columns at 8, 12, 16 (vec4-strided)
    const a = [d[o + 8], d[o + 9], d[o + 10]];
    const b = [d[o + 12], d[o + 13], d[o + 14]];
    const c = [d[o + 16], d[o + 17], d[o + 18]];
    const det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    r.detSum += m === "water" ? d[o + 32] : det;
    r.jpSum += d[o + 32];
    if (d[o + 32] < 0.95) r.jpLow += 1;
    r.auxMax = Math.max(r.auxMax, d[o + 35]);
  }
  const out: Record<string, unknown> = {};
  for (const [m, r] of Object.entries(per)) {
    const ys = r.ys.slice().sort((x, y) => x - y);
    const q = (p: number) => ys[Math.min(ys.length - 1, Math.floor(p * ys.length))];
    const row: Record<string, unknown> = {
      n: r.n,
      yMean: r.ySum / r.n,
      yP95: q(0.95),
      yP99: q(0.99),
      yMax: r.yMax,
      meanVolumeRatio: r.detSum / r.n,
      meanJp: r.jpSum / r.n,
      fracJpBelow095: r.jpLow / r.n,
      maxPlastic: r.auxMax,
      ...footprint(r.xs, r.zs),
    };
    if (m === "sand") Object.assign(row, reposeAngle(r.xs, r.ys, r.zs, dx));
    if (m === "snow" || m === "jelly" || m === "clay") Object.assign(row, fragments(r.xs, r.ys, r.zs, dx));
    out[m] = row;
  }
  return out;
}

function footprint(xs: number[], zs: number[]) {
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < xs.length; i += 1) {
    cx += xs[i];
    cz += zs[i];
  }
  cx /= xs.length;
  cz /= zs.length;
  const rs = xs.map((x, i) => Math.hypot(x - cx, zs[i] - cz)).sort((a, b) => a - b);
  return { centerX: cx, centerZ: cz, r50: rs[Math.floor(0.5 * rs.length)], r95: rs[Math.floor(0.95 * rs.length)], rMax: rs[rs.length - 1] };
}

/**
 * Angle of repose from the pile's top surface: per 1-cell radial bin around
 * the pile's centroid, the 98th-percentile height; fit a line to the bins with
 * 0.2 hmax < h < 0.8 hmax.
 */
function reposeAngle(xs: number[], ys: number[], zs: number[], dx: number) {
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < xs.length; i += 1) {
    cx += xs[i];
    cz += zs[i];
  }
  cx /= xs.length;
  cz /= zs.length;
  const bins: number[][] = [];
  for (let i = 0; i < xs.length; i += 1) {
    const b = Math.floor(Math.hypot(xs[i] - cx, zs[i] - cz) / dx);
    (bins[b] ??= []).push(ys[i]);
  }
  const prof: [number, number][] = [];
  for (let b = 0; b < bins.length; b += 1) {
    const v = bins[b];
    if (!v || v.length < 8) continue;
    v.sort((a, c) => a - c);
    prof.push([(b + 0.5) * dx, v[Math.floor(0.98 * (v.length - 1))]]);
  }
  const hmax = Math.max(...prof.map((p) => p[1]));
  const sel = prof.filter((p) => p[1] > 0.2 * hmax && p[1] < 0.8 * hmax);
  let angleDeg = NaN;
  if (sel.length >= 3) {
    const mx = sel.reduce((a, p) => a + p[0], 0) / sel.length;
    const my = sel.reduce((a, p) => a + p[1], 0) / sel.length;
    let sxy = 0;
    let sxx = 0;
    for (const p of sel) {
      sxy += (p[0] - mx) * (p[1] - my);
      sxx += (p[0] - mx) ** 2;
    }
    angleDeg = (Math.atan(Math.abs(sxy / sxx)) * 180) / Math.PI;
  }
  return { pileHeight: hmax, reposeAngleDeg: angleDeg, reposeBins: sel.length, profile: prof.map((p) => [+p[0].toFixed(3), +p[1].toFixed(3)]) };
}

/** Connected pieces (26-connected occupied cells; pieces under 4 cells ignored). */
function fragments(xs: number[], ys: number[], zs: number[], dx: number) {
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  const occ = new Map<string, number>();
  for (let p = 0; p < xs.length; p += 1) {
    const k = key(Math.floor(xs[p] / dx), Math.floor(ys[p] / dx), Math.floor(zs[p] / dx));
    occ.set(k, (occ.get(k) ?? 0) + 1);
  }
  const seen = new Set<string>();
  const sizes: number[] = [];
  for (const k0 of occ.keys()) {
    if (seen.has(k0)) continue;
    let count = 0;
    const stack = [k0];
    seen.add(k0);
    while (stack.length) {
      const k = stack.pop() as string;
      count += occ.get(k) ?? 0;
      const [i, j, l] = k.split(",").map(Number);
      for (let a = -1; a <= 1; a += 1)
        for (let b = -1; b <= 1; b += 1)
          for (let c = -1; c <= 1; c += 1) {
            const kk = key(i + a, j + b, l + c);
            if (!seen.has(kk) && occ.has(kk)) {
              seen.add(kk);
              stack.push(kk);
            }
          }
    }
    sizes.push(count);
  }
  sizes.sort((a, b) => b - a);
  const total = xs.length;
  return { pieces: sizes.filter((v) => v >= 32).length, largestPieceFrac: sizes[0] / total, piecesOver1pct: sizes.filter((v) => v >= 0.01 * total).length };
}

// ---- other tasks -------------------------------------------------------------------

async function svdcheck(count: number) {
  const d = env.device;
  const module = d.createShaderModule({ code: `${preludeWgsl}\n${svdWgsl}` });
  const pipe = d.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "svd_check" } });
  const rng = mulberry(7);
  const F = new Float32Array(count * 9);
  const kinds: string[] = [];
  for (let i = 0; i < count; i += 1) {
    // mix: random near-identity, large stretch, near-singular, inverted
    const kind = i % 4;
    kinds.push(["near-identity", "large", "near-singular", "inverted"][kind]);
    for (let e = 0; e < 9; e += 1) {
      const id = e % 4 === 0 ? 1 : 0;
      let v = id + (rng() - 0.5) * (kind === 0 ? 0.2 : 2.0);
      if (kind === 2 && e >= 6) v = F[i * 9 + e - 3] * 0.999 + (rng() - 0.5) * 1e-3;
      F[i * 9 + e] = v;
    }
    if (kind === 3) for (let e = 0; e < 3; e += 1) F[i * 9 + e] *= -1;
  }
  const inBuf = d.createBuffer({ size: F.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  d.queue.writeBuffer(inBuf, 0, F);
  const outBuf = d.createBuffer({ size: count * 21 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const st = d.createBuffer({ size: count * 21 * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const bg = d.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: inBuf } }, { binding: 1, resource: { buffer: outBuf } }] });
  const enc = d.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(pipe);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(Math.ceil(count / 64));
  pass.end();
  enc.copyBufferToBuffer(outBuf, 0, st, 0, count * 21 * 4);
  d.queue.submit([enc.finish()]);
  await st.mapAsync(GPUMapMode.READ);
  const o = new Float32Array(st.getMappedRange().slice(0));
  st.unmap();
  const worst: Record<string, { recon: number; orthoU: number; orthoV: number }> = {};
  for (let i = 0; i < count; i += 1) {
    const U = Array.from(o.subarray(i * 21, i * 21 + 9));
    const sg = Array.from(o.subarray(i * 21 + 9, i * 21 + 12));
    const V = Array.from(o.subarray(i * 21 + 12, i * 21 + 21));
    let rec = 0;
    let fn = 0;
    for (let r = 0; r < 3; r += 1)
      for (let c = 0; c < 3; c += 1) {
        let v = 0;
        for (let k = 0; k < 3; k += 1) v += U[r * 3 + k] * sg[k] * V[c * 3 + k];
        rec = Math.max(rec, Math.abs(v - F[i * 9 + r * 3 + c]));
        fn = Math.max(fn, Math.abs(F[i * 9 + r * 3 + c]));
      }
    const ortho = (M: number[]) => {
      let e = 0;
      for (let a = 0; a < 3; a += 1)
        for (let b = 0; b < 3; b += 1) {
          let v = 0;
          for (let k = 0; k < 3; k += 1) v += M[k * 3 + a] * M[k * 3 + b];
          e = Math.max(e, Math.abs(v - (a === b ? 1 : 0)));
        }
      return e;
    };
    const w = (worst[kinds[i]] ??= { recon: 0, orthoU: 0, orthoV: 0 });
    w.recon = Math.max(w.recon, rec / Math.max(fn, 1e-30));
    w.orthoU = Math.max(w.orthoU, ortho(U));
    w.orthoV = Math.max(w.orthoV, ortho(V));
  }
  return { count, worstRelativeReconstruction: worst };
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tier timing on the Table scene: warm up, then GPU ms per frame. */
async function bench(cfg: { gridX: number; substeps: number; iterations: number; warm?: number; frames?: number; scene?: string; split?: boolean }) {
  const res = await run({ scene: cfg.scene ?? "table", gridX: cfg.gridX, substeps: cfg.substeps, iterations: cfg.iterations, benchAt: (cfg.warm ?? 30) / 60, benchFrames: cfg.frames ?? 30 });
  return res;
}

async function determinism(cfg: RunCfg) {
  const hashes: string[] = [];
  for (let r = 0; r < 2; r += 1) {
    await run(cfg);
    const s = sims.get(cfg.gridX ?? 128) as PbMpm;
    const d = await s.readParticles();
    const h = await crypto.subtle.digest("SHA-256", new Uint8Array(d.buffer as ArrayBuffer));
    hashes.push([...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""));
  }
  return { hashes, identical: hashes[0] === hashes[1] };
}

window.spike = {
  info: () => ({
    adapter: env.info,
    adapterId: `${env.info.vendor} ${env.info.architecture} ${env.info.description}`.trim(),
    features: [...env.adapter.features],
    limits: { maxStorageBufferBindingSize: env.device.limits.maxStorageBufferBindingSize, maxBufferSize: env.device.limits.maxBufferSize, maxStorageBuffersPerShaderStage: env.device.limits.maxStorageBuffersPerShaderStage },
    timestamp: env.device.features.has("timestamp-query"),
  }),
  run,
  bench,
  svdcheck,
  determinism,
};
window.__spikeReady = true;
