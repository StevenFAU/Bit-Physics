// "Your GPU's backprop matches the reference" (Teach, M2; spec § The proof).
// The trainer's raw gradients on a few small fixed cases, computed here on the
// visitor's GPU, against float64 autograd gradients committed in
// public/teach/gradcheck.{json,bin} (written by
// packages/neural-ca/python/neural_ca/gradcheck.py with the trainer's own
// counter-hash fire masks). Each case is one training iteration without the
// optimiser, run through the same sliced job Teach trains with, a few units
// per page frame. The budget is declared in tolerance.toml from measurement.

import { hash3, unit } from "@bp/runtime";
import { sha256hex } from "@bp/verify";
import type { Checkpoint } from "../proof/gate.js";
import { assetUrl } from "../proof/gate.js";
import type { OrganismLibrary } from "../model/organisms.js";
import type { FrameScheduler } from "../runtime/scheduler.js";
import { TrainJob } from "./job.js";
import { toTrainer } from "./layout.js";
import { relL2 } from "./metrics.js";
import type { TrainKernels } from "./trainer.js";
import { NcaTrainer } from "./trainer.js";

const CN = 16;

interface ArrayRef {
  offset: number;
  bytes: number;
  dtype: string;
  count: number;
}

export interface GradcheckCase {
  name: string;
  weights: "disk" | "gecko" | "random";
  weights_file: string | null;
  start: "seed" | "blob";
  steps: number;
  batch: number;
  seed: number;
  grad64: ArrayRef;
  loss64: number;
  alive_cells64: number;
  living_at_end64: number;
  f32_autograd_rel_l2: number;
  f32_autograd_loss_rel: number;
}

export interface GradcheckManifest {
  grid: number;
  nparam: number;
  sha256: string;
  random_params_seed: number;
  torch: string;
  arrays: { target: ArrayRef; random_params: ArrayRef };
  cases: GradcheckCase[];
}

export interface Fixture {
  manifest: GradcheckManifest;
  blob: ArrayBuffer;
}

export async function fetchGradcheck(): Promise<Fixture> {
  const [m, b] = await Promise.all([
    fetch(assetUrl("teach/gradcheck.json")).then((r) => {
      if (!r.ok) throw new Error(`gradient-check manifest fetch failed: ${r.status}`);
      return r.json() as Promise<GradcheckManifest>;
    }),
    fetch(assetUrl("teach/gradcheck.bin")).then((r) => {
      if (!r.ok) throw new Error(`gradient-check data fetch failed: ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);
  const sha = await sha256hex(b);
  if (sha !== m.sha256) throw new Error(`gradient-check data does not match its manifest (${sha.slice(0, 12)}…)`);
  return { manifest: m, blob: b };
}

function f32(blob: ArrayBuffer, a: ArrayRef): Float32Array<ArrayBuffer> {
  return new Float32Array(blob.slice(a.offset, a.offset + a.bytes));
}

function f64(blob: ArrayBuffer, a: ArrayRef): Float64Array {
  return new Float64Array(blob.slice(a.offset, a.offset + a.bytes));
}

/** The case's start cells, every sample (cell-major, 16 channels): the seed cell, or the hashed blob of neural_ca/gradcheck.py. */
export function startCells(start: "seed" | "blob", batch: number, G: number): Float32Array<ArrayBuffer> {
  const s = new Float32Array(batch * G * G * CN);
  const m = G >> 1;
  for (let b = 0; b < batch; b += 1) {
    for (let y = 0; y < G; y += 1) {
      for (let x = 0; x < G; x += 1) {
        const o = ((b * G + y) * G + x) * CN;
        if (start === "seed") {
          if (x === m && y === m) for (let c = 3; c < CN; c += 1) s[o + c] = 1;
        } else if ((x - m) ** 2 + (y - m) ** 2 <= 81) {
          for (let c = 0; c < CN; c += 1) {
            const u = unit(hash3(7, b * CN + c, y * G + x));
            s[o + c] = c === 3 ? 0.15 + 0.85 * u : u;
          }
        }
      }
    }
  }
  return s;
}

export interface CaseResult {
  name: string;
  steps: number;
  batch: number;
  /** ‖g_gpu − g_f64‖ / ‖g_f64‖ over all 8,320 parameters. */
  relL2: number;
  perTensor: { w1: number; b1: number; w2: number };
  lossGpu: number;
  lossRel: number;
  /** float32 PyTorch autograd's own distance from float64 on the same case (from the fixture). */
  f32Autograd: number;
  aliveCells: number;
  aliveCellsRef: number;
}

export interface GradcheckResult {
  cases: CaseResult[];
  worst: number;
  seconds: number;
  /** Page frames the runs were spread over. */
  slices: number;
}

export async function runGradcheck(
  device: GPUDevice,
  kernels: TrainKernels,
  scheduler: FrameScheduler,
  fx: Fixture,
  gated: Checkpoint,
  lib: OrganismLibrary,
  onProgress?: (msg: string) => void,
): Promise<GradcheckResult> {
  const { manifest: m, blob } = fx;
  const G = m.grid;
  const target = f32(blob, m.arrays.target);
  const t0 = performance.now();
  const out: CaseResult[] = [];
  let slices = 0;
  for (const c of m.cases) {
    onProgress?.(`${c.name}: ${c.steps} steps forward and back, batch ${c.batch}`);
    const params =
      c.weights === "random" ? f32(blob, m.arrays.random_params) : toTrainer(c.weights === "disk" ? gated.weights : (await lib.get(c.weights)).ck.weights);
    const tr = new NcaTrainer(device, kernels, { G, B: c.batch, Tmax: c.steps, poolSize: 0, evalTmax: 0 });
    try {
      tr.setParams(params);
      tr.setTarget(target);
      tr.writeStart(startCells(c.start, c.batch, G));
      const job = new TrainJob(tr, null, target);
      job.enqueue({ T: c.steps, seed: c.seed, pool: null, seedAll: false, adam: false, lr: 0, adamStep: 1, damage: 0 });
      const before = scheduler.slicesOf(job.name);
      await scheduler.add(job);
      slices += scheduler.slicesOf(job.name) - before;
      job.destroy();
      const read = async (src: GPUBuffer, size: number): Promise<ArrayBuffer> => {
        const st = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: "teach-gradcheck-read" });
        const enc = device.createCommandEncoder({ label: "teach-gradcheck-read" });
        enc.copyBufferToBuffer(src, 0, st, 0, size);
        device.queue.submit([enc.finish()]);
        await st.mapAsync(GPUMapMode.READ);
        const r = st.getMappedRange().slice(0);
        st.destroy();
        return r;
      };
      const [g, l, a] = await Promise.all([
        read(tr.grad, m.nparam * 4),
        read(tr.lossOut, (c.batch + 1) * 4),
        read(tr.alive, c.steps * c.batch * G * G * 4),
      ]);
      const gpu = new Float32Array(g);
      const ref = f64(blob, c.grad64);
      const loss = new Float32Array(l)[c.batch]!;
      let alive = 0;
      for (const v of new Uint32Array(a)) alive += v;
      out.push({
        name: c.name,
        steps: c.steps,
        batch: c.batch,
        relL2: relL2(gpu, ref),
        perTensor: { w1: relL2(gpu, ref, 0, 6144), b1: relL2(gpu, ref, 6144, 6272), w2: relL2(gpu, ref, 6272, 8320) },
        lossGpu: loss,
        lossRel: Math.abs(loss - c.loss64) / c.loss64,
        f32Autograd: c.f32_autograd_rel_l2,
        aliveCells: alive,
        aliveCellsRef: c.alive_cells64,
      });
    } finally {
      tr.destroy();
    }
  }
  return { cases: out, worst: Math.max(...out.map((r) => r.relL2)), seconds: (performance.now() - t0) / 1000, slices };
}
