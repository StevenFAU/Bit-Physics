// Grow training spike — page entry. No UI: it exposes `window.spike` for the
// headless driver (run-spike.mjs) and prints progress to the console.

import { acquireGpu, pickTier, readTierEnvironment, type GpuContext } from "@bp/gpu";
import { NcaTrainer, schedule, type IterationResult, type TrainerShape } from "./trainer.js";

const logEl = document.getElementById("log")!;
const say = (s: string): void => {
  logEl.textContent += `${s}\n`;
  console.log(s);
};

// ---------------------------------------------------------------- base64

function toB64(buf: ArrayBufferLike): string {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(s: string): ArrayBuffer {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------ state

let ctx: GpuContext | null = null;
let trainer: NcaTrainer | null = null;

async function gpu(): Promise<GpuContext> {
  if (!ctx) {
    ctx = await acquireGpu({ label: "grow-train-spike" });
    ctx.device.addEventListener("uncapturederror", (e) => {
      say(`GPU ERROR: ${(e as GPUUncapturedErrorEvent).error.message}`);
      (window as unknown as { __spikeErrors: string[] }).__spikeErrors.push((e as GPUUncapturedErrorEvent).error.message);
    });
  }
  return ctx;
}

async function alloc(shape: TrainerShape): Promise<NcaTrainer> {
  trainer?.destroy();
  trainer = null;
  const c = await gpu();
  c.device.pushErrorScope("validation");
  c.device.pushErrorScope("out-of-memory");
  const t = new NcaTrainer(c, shape);
  const oom = await c.device.popErrorScope();
  const val = await c.device.popErrorScope();
  if (oom) throw new Error(`out of memory: ${oom.message}`);
  if (val) throw new Error(`validation: ${val.message}`);
  trainer = t;
  await c.device.queue.onSubmittedWorkDone();
  return t;
}

// ----------------------------------------------------------------- metrics

interface Metrics {
  mse: number;
  iou: number;
  rgbErr: number;
  overgrowth: number;
}

/** Mean over samples: MSE (RGBA, unclamped, = the training loss), IoU of
 * alpha > 0.5 with the target's, mean RGB distance inside the target, and
 * the area grown outside the target relative to the target's area. */
function metrics(cells: Float32Array, target: Float32Array, G: number, B: number): Metrics {
  let mse = 0;
  let iou = 0;
  let rgb = 0;
  let over = 0;
  const area = target.reduce((a, _v, i) => (i % 4 === 3 && target[i]! > 0.5 ? a + 1 : a), 0);
  for (let b = 0; b < B; b += 1) {
    let se = 0;
    let inter = 0;
    let uni = 0;
    let rg = 0;
    let out = 0;
    for (let c = 0; c < G * G; c += 1) {
      const o = (b * G * G + c) * 16;
      const ta = target[c * 4 + 3]!;
      for (let k = 0; k < 4; k += 1) {
        const d = cells[o + k]! - target[c * 4 + k]!;
        se += d * d;
      }
      const a = Math.min(1, Math.max(0, cells[o + 3]!)) > 0.5;
      const t = ta > 0.5;
      if (a && t) inter += 1;
      if (a || t) uni += 1;
      if (a && !t) out += 1;
      if (t) {
        let d2 = 0;
        for (let k = 0; k < 3; k += 1) {
          const d = Math.min(1, Math.max(0, cells[o + k]!)) - target[c * 4 + k]!;
          d2 += d * d;
        }
        rg += Math.sqrt(d2);
      }
    }
    mse += se / (G * G * 4);
    iou += uni > 0 ? inter / uni : 0;
    rgb += rg / Math.max(1, area);
    over += out / Math.max(1, area);
  }
  return { mse: mse / B, iou: iou / B, rgbErr: rgb / B, overgrowth: over / B };
}

/** RGBA (clamped) of the first k samples, sample-major (k, G, G, 4). */
function rgbaOf(cells: Float32Array, G: number, k: number): Float32Array {
  const out = new Float32Array(k * G * G * 4);
  for (let i = 0; i < k * G * G; i += 1) {
    for (let c = 0; c < 4; c += 1) out[i * 4 + c] = Math.min(1, Math.max(0, cells[i * 16 + c]!));
  }
  return out;
}

// --------------------------------------------------------------------- API

interface GradCase {
  name: string;
  grid: number;
  batch: number;
  steps: number;
  seed: number;
  params: string;
  x0: string;
  target: string;
}

interface TrainConfig {
  target: string;
  G: number;
  B: number;
  Tmin: number;
  Tmax: number;
  poolSize: number;
  iters: number;
  lr: number;
  decayAt: number;
  seed: number;
  evalEvery: number;
  evalSteps: number[];
  snapshotEvery: number;
  dense?: boolean;
  label?: string;
}

const api = {
  async info(): Promise<Record<string, unknown>> {
    const c = await gpu();
    const lim: Record<string, number> = {};
    for (const k of [
      "maxBufferSize",
      "maxStorageBufferBindingSize",
      "maxUniformBufferBindingSize",
      "maxComputeWorkgroupStorageSize",
      "maxStorageBuffersPerShaderStage",
      "maxComputeInvocationsPerWorkgroup",
    ]) {
      lim[k] = (c.device.limits as unknown as Record<string, number>)[k]!;
      lim[`adapter.${k}`] = (c.adapter.limits as unknown as Record<string, number>)[k]!;
    }
    return {
      adapter: c.info,
      adapterId: c.adapterId,
      tier: pickTier(c, readTierEnvironment(), null),
      features: [...c.features],
      timestamps: c.timestamps,
      limits: lim,
      userAgent: navigator.userAgent,
    };
  },

  async alloc(shape: TrainerShape): Promise<{ memory: Record<string, number>; total: number }> {
    const t = await alloc(shape);
    return { memory: t.memory, total: t.totalBytes };
  },

  free(): void {
    trainer?.destroy();
    trainer = null;
  },

  /** Raw (pre-normalisation) gradients of one rollout per case. */
  async gradcheck(cases: GradCase[]): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    for (const cs of cases) {
      const t = await alloc({ G: cs.grid, B: cs.batch, Tmax: Math.max(2, cs.steps), poolSize: 0, evalTmax: 2 });
      t.setParams(new Float32Array(fromB64(cs.params)));
      t.setTarget(new Float32Array(fromB64(cs.target)));
      const r = await t.gradOnce(new Float32Array(fromB64(cs.x0)), cs.steps, cs.seed);
      const alive8 = Uint8Array.from(r.alive);
      out.push({
        name: cs.name,
        seed: cs.seed,
        loss: r.loss,
        grad: toB64(r.grad.buffer),
        xT: toB64(r.xT.buffer),
        alive: toB64(alive8.buffer),
      });
      say(`gradcheck ${cs.name}: loss ${r.loss.toExponential(6)}`);
    }
    api.free();
    return out;
  },

  async train(cfg: TrainConfig): Promise<Record<string, unknown>> {
    const evalTmax = Math.max(2, ...cfg.evalSteps);
    const t = await alloc({ G: cfg.G, B: cfg.B, Tmax: cfg.Tmax, poolSize: cfg.poolSize, evalTmax });
    const target = new Float32Array(fromB64(cfg.target));
    t.setTarget(target);
    t.initParams(cfg.seed);
    if (cfg.poolSize > 0) t.resetPool();
    await t.drain();
    const log: IterationResult[] = [];
    const evals: Record<string, unknown>[] = [];
    const snaps: Record<string, string> = {};
    let trainMs = 0;
    let evalMs = 0;
    const t0 = performance.now();
    let seg = performance.now();
    const evalSeed = 0x0e7a1;
    for (let i = 0; i < cfg.iters; i += 1) {
      const s = schedule(cfg.seed, i, cfg.Tmin, cfg.Tmax, cfg.B, cfg.poolSize);
      const lr = cfg.lr * (i < cfg.decayAt ? 1 : 0.1);
      const { result } = await t.submitIteration(i, s.T, s.seed, s.pool, lr, cfg.dense ?? false);
      void result.then((r) => {
        if (r) log.push(r);
      });
      const last = i + 1 === cfg.iters;
      if (cfg.evalEvery > 0 && ((i + 1) % cfg.evalEvery === 0 || last)) {
        await t.drain();
        const now = performance.now();
        trainMs += now - seg;
        const row: Record<string, unknown> = { iter: i + 1, trainMs, wallMs: now - t0 };
        for (const steps of cfg.evalSteps) {
          const cells = await t.evalFromSeed(steps, evalSeed);
          row[`T${steps}`] = metrics(cells, target, cfg.G, cfg.B);
          if (cfg.snapshotEvery > 0 && ((i + 1) % cfg.snapshotEvery === 0 || last)) {
            snaps[`${i + 1}:${steps}`] = toB64(rgbaOf(cells, cfg.G, Math.min(4, cfg.B)).buffer);
          }
        }
        const lastLoss = log.length ? log[log.length - 1]!.loss : NaN;
        row.trainLoss = lastLoss;
        evals.push(row);
        const m = row[`T${cfg.evalSteps[0]}`] as Metrics;
        say(
          `${cfg.label ?? "train"} it ${i + 1}  ${(trainMs / 1000).toFixed(1)} s  loss ${lastLoss.toExponential(3)}  ` +
            `IoU@${cfg.evalSteps[0]} ${m.iou.toFixed(3)}  rgbErr ${m.rgbErr.toFixed(3)}`,
        );
        seg = performance.now();
        evalMs += seg - now;
      }
    }
    await t.drain();
    trainMs += performance.now() - seg;
    const theta = await t.read(t.theta, 8320 * 4);
    const res = {
      label: cfg.label,
      memory: t.memory,
      totalBytes: t.totalBytes,
      trainMs,
      evalMs,
      log: log.map((r) => [r.iter, r.T, r.loss, r.gpu?.total ?? null, r.gpu?.fwd ?? null, r.gpu?.bwd ?? null, r.gpu?.opt ?? null]),
      evals,
      snaps,
      theta: toB64(theta),
      thetaSha: await sha256(theta),
      kernels: await t.profileKernels(cfg.Tmax, 12345, 3),
    };
    api.free();
    return res;
  },
};

declare global {
  interface Window {
    spike: typeof api;
    __spikeReady: boolean;
    __spikeErrors: string[];
  }
}

window.__spikeErrors = [];
window.spike = api;
void gpu()
  .then((c) => {
    say(`adapter: ${c.adapterId}  timestamps: ${c.timestamps}`);
    window.__spikeReady = true;
  })
  .catch((e: unknown) => {
    say(`no WebGPU: ${String(e)}`);
    window.__spikeReady = true;
  });
