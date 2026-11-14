// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. Individual trajectories
// diverge from any reference by design; what is checked is the short horizon
// against f64, determinism, and that the live kernels are the gated ones.

import { h, proofCard } from "@bp/studio";
import { sci } from "../format.js";
import type { Chaos, ChaosKernels } from "../model/ensemble.js";
import { Chaos as ChaosModel } from "../model/ensemble.js";
import type { LorenzParams, V3 } from "../model/lorenz.js";
import { CLASSIC, deviationStep, rk4Step } from "../model/lorenz.js";
import type { LyapunovEstimate } from "../model/lyapunov.js";
import { kaplanYorke, lyapunovSpectrum, traceOf } from "../model/lyapunov.js";
import { CLASSIC_BOX, histogramXZ, referenceRun, tvDistance } from "../model/measure.js";
import { BUDGET, LYAP_T, SPROTT } from "./budgets.js";
import type { GateCheck, GateRunner } from "./gate.js";
import { CANONICAL_IC, CAPTURE_INTERVAL, N_STEPS, REPO_BLOB, SEED42_OFFSET, T_STRANGE_MEAN_ABS, T_STRANGE_REL, buildCapture, checkGate } from "./gate.js";

const blob = (path: string): string => `${REPO_BLOB}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  gate: GateRunner;
  /** The live kernels, once compiled (null while the page is still loading). */
  kernels: () => ChaosKernels | null;
  /** Suspend/resume the governor and the live loop around in-page runs. */
  hold: (on: boolean) => void;
}

export interface LyapunovCheck {
  estimate: LyapunovEstimate;
  l1Err: number;
  l2Abs: number;
  sumRel: number;
  ky: number;
  ms: number;
}

export interface InvariantCheck {
  tv: number;
  /** TV between two independent f64 runs of the reference's length: the comparison's own noise floor. */
  floor: number;
  members: number;
  snapshots: number;
  outside: number;
  refSamples: number;
  t: number;
}

export interface OnScreen {
  params: LorenzParams;
  released: boolean;
  eps: number;
  members: number;
}

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  /** Results of the last run, for tests. */
  results: Record<string, unknown>;
  runAll(): Promise<void>;
  /** The invariant-measure run with other settings (measurement, tests). */
  measureInvariant(o?: { members?: number; t0?: number; snapshots?: number; gap?: number }): Promise<InvariantCheck | null>;
}

/** The live density kernel, one particle from the gate's start, 10,000 steps: the same bytes as the gated trajectory? */
export interface LiveCheck {
  identical: boolean;
  /** Sampled steps compared (every 1,000th and the last). */
  compared: number;
  firstMismatch: number | null;
}

/** f32 offsets on the GPU vs the same offsets in f64: relative error at t = 10. */
export interface OffsetCheck {
  members: number;
  eps: number;
  steps: number;
  worstRel: number;
  medianRel: number;
  /** Growth of the f64 offsets over the run (how far the ball stretched). */
  growth: number;
}

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  pane.append(
    h("h2", {}, "What is checked"),
    h(
      "p",
      {},
      "Two trajectories of a chaotic system that start a hair apart end up anywhere relative to each other — that is the point of this page, so no trajectory here can match a reference for long. " +
        "What can be checked is checked: the release gate re-runs the canonical trajectory in a real browser before every release and requires two runs to match byte for byte and to stay on the attractor of a double-precision reference; " +
        "and the kernels behind the picture are shown to be the gated one, and to resolve the ball as finely as claimed.",
    ),
  );
  const onScreen = h("p", { class: "cx-onscreen", role: "status" }, "");
  pane.append(onScreen);
  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);
  const results: Record<string, unknown> = {};

  // 1. the release gate, as CI runs it
  const gateCard = proofCard(
    {
      title: "The release gate",
      sentence:
        `The committed RK4 kernel integrates Lorenz's system (σ 10, ρ 28, β 8/3, Δt 0.01) from the seed-42 start for ${N_STEPS.toLocaleString()} steps, twice. ` +
        `The two captures (every ${CAPTURE_INTERVAL.toLocaleString()}th state) must match byte for byte, and every state must lie inside the attractor of a double-precision run, ` +
        `widened by ${Math.round(T_STRANGE_REL * 100)}% of its extent plus ${T_STRANGE_MEAN_ABS}.`,
      label: "run-twice byte-identical, on the attractor",
      action: "Run on this GPU",
      links: [
        { label: "gate source", href: blob("tools/productization/web-deploy/verify.py") },
        { label: "capture code", href: blob("packages/strange-attractors/web/src/v2/proof/gate.ts") },
        { label: "kernel", href: blob("packages/strange-attractors/src/lorenz_rk4.wgsl") },
      ],
    },
    () => void runGate(),
  );
  gateCard.set({ status: "idle", measured: "run it to measure", budget: `envelope + ${Math.round(T_STRANGE_REL * 100)}% + ${T_STRANGE_MEAN_ABS}`, adapter: d.adapter });
  pane.append(gateCard.el);

  // 2. live ≡ gated
  const liveCard = proofCard(
    {
      title: "The picture runs the gated arithmetic",
      sentence:
        "The kernel that moves the attractor's half-million points shares the gated kernel's field and RK4 code character for character. " +
        "Started as one point at the gate's start, run for 10,000 steps in 1,000-step batches, it must give the gated trajectory's states byte for byte.",
      label: "byte-identical",
      action: "Run on this GPU",
      links: [{ label: "live kernel", href: blob("packages/strange-attractors/web/src/v2/model/ensemble.wgsl") }],
    },
    () => void runLive(),
  );
  liveCard.set({ status: "idle", measured: "run it to measure", budget: "0 differing bits", adapter: d.adapter });
  pane.append(liveCard.el);

  // 3. offsets resolve the ball
  const offsetCard = proofCard(
    {
      title: "A 10⁻⁹ ball is resolved",
      sentence:
        "The ball's members are stored as single-precision offsets from a double-precision centre. Released 10⁻⁹ wide and run to t = 10 (the ball grows about 10⁴-fold), " +
        "64 members are compared with the same offsets integrated in double precision. In absolute f32 coordinates this ball would not exist: near |x| ≈ 20, f32 numbers are 2 × 10⁻⁶ apart.",
      label: "illustrative (not gated)",
      action: "Run on this GPU",
      links: [{ label: "f64 reference", href: blob("packages/strange-attractors/web/src/v2/model/lorenz.ts") }],
    },
    () => void runOffsets(),
  );
  offsetCard.set({ status: "idle", measured: "run it to measure", budget: "not gated (measured)", adapter: d.adapter });
  pane.append(offsetCard.el);

  // 4–6. the Lyapunov spectrum, in f64 (one run feeds three cards)
  pane.append(
    h("h2", {}, "How chaotic, measured"),
    h(
      "p",
      { class: "cx-note" },
      `Benettin's method in double precision on this machine's CPU: one trajectory from (1, 1, 1) carries three tangent vectors, ` +
        `re-orthonormalised every 0.1 time units, averaged over ${LYAP_T.toLocaleString()} time units after a 20-unit transient (about a tenth of a second). ` +
        "These are Prove checks with declared budgets, not release gates.",
    ),
  );
  const tol = { label: "declared in tolerance.toml", href: blob("tools/testkit/equivalence/tolerance.toml") };
  const lyapLink = { label: "estimator", href: blob("packages/strange-attractors/web/src/v2/model/lyapunov.ts") };
  const l1Card = proofCard(
    {
      title: "The largest exponent, λ₁",
      sentence: `λ₁ measures how fast neighbouring trajectories separate. Sprott's reference value for these parameters is ${SPROTT.l1}; this run must land within the declared band.`,
      label: "reference agreement passed (not gated)",
      action: "Run",
      links: [lyapLink, tol],
    },
    () => void runLyapunov(),
  );
  const l2Card = proofCard(
    {
      title: "The middle exponent is zero",
      sentence: "A flow that neither stops nor blows up has one exponent of exactly zero, along the direction of motion. The measured λ₂ must be within the declared band of 0.",
      label: "analytic check passed (not gated)",
      action: "Run",
      links: [lyapLink, tol],
    },
    () => void runLyapunov(),
  );
  const sumCard = proofCard(
    {
      title: "The exponents sum to the trace",
      sentence:
        "Lorenz's flow shrinks every volume at the same rate everywhere: the trace of its Jacobian is −(σ + 1 + β) = −41/3 at every point. " +
        "So λ₁ + λ₂ + λ₃ must equal −41/3. What is left over is the integrator's own volume error.",
      label: "analytic check passed (not gated)",
      action: "Run",
      links: [lyapLink, tol],
    },
    () => void runLyapunov(),
  );
  for (const [c, b] of [
    [l1Card, `|λ₁ − ${SPROTT.l1}| ≤ ${BUDGET.l1Abs}`],
    [l2Card, `|λ₂| ≤ ${BUDGET.l2Abs}`],
    [sumCard, `${BUDGET.sumRel.toExponential(1)} relative`],
  ] as const) {
    c.set({ status: "idle", measured: "run it to measure", budget: b, adapter: "CPU (f64)" });
    pane.append(c.el);
  }

  // 7. the invariant measure
  const imCard = proofCard(
    {
      title: "The forgotten cloud is the attractor's own distribution",
      sentence:
        "262,144 starts, released 10⁻⁶ wide on the GPU, are run until long after they have forgotten where they began, then binned on the (x, z) plane at eight moments. " +
        "Their histogram must match one long double-precision trajectory's: a check on distributions, which divergence cannot spoil.",
      label: "reference agreement passed (not gated)",
      action: "Run on this GPU",
      links: [{ label: "histograms", href: blob("packages/strange-attractors/web/src/v2/model/measure.ts") }, tol],
    },
    () => void runInvariant(),
  );
  imCard.set({ status: "idle", measured: "run it to measure", budget: `total variation ≤ ${BUDGET.invariantTv}`, adapter: d.adapter });
  pane.append(imCard.el);

  let running = false;
  const guard = async (fn: () => Promise<void>): Promise<void> => {
    if (running) return;
    running = true;
    d.hold(true);
    try {
      await fn();
    } finally {
      d.hold(false);
      running = false;
    }
  };

  async function runGate(): Promise<void> {
    await guard(async () => {
      gateCard.set({ status: "running" });
      const a = buildCapture(await d.gate.trajectory());
      const b = buildCapture(await d.gate.trajectory());
      const c: GateCheck = checkGate(a, b);
      results["gate"] = c;
      gateCard.set({
        status: c.passed ? "pass" : "fail",
        measured: `${c.identical ? "identical" : "DIFFERENT"}; deepest into the margin ${(c.worstRatio * 100).toFixed(1)}%`,
        budget: `envelope + ${Math.round(T_STRANGE_REL * 100)}% + ${T_STRANGE_MEAN_ABS}`,
        ratio: c.worstRatio,
        adapter: d.adapter,
        notes: [`${c.points} states, all finite: ${c.finite}`, `largest overshoot past the limit: ${c.worstOut.toFixed(3)} (≤ 0 passes)`],
      });
    });
  }

  async function runLive(): Promise<void> {
    const k = d.kernels();
    if (!k) {
      liveCard.set({ status: "info", measured: "the live kernels are still compiling" });
      return;
    }
    await guard(async () => {
      liveCard.set({ status: "running" });
      const r = await liveVsGate(d.device, k, d.gate);
      results["live"] = r;
      liveCard.set({
        status: r.identical ? "pass" : "fail",
        measured: r.identical ? `${r.compared} of ${r.compared} states identical` : `first difference at step ${r.firstMismatch}`,
        budget: "0 differing bits",
        ratio: r.identical ? 0 : 1.2,
        adapter: d.adapter,
      });
    });
  }

  async function runOffsets(): Promise<void> {
    const k = d.kernels();
    if (!k) {
      offsetCard.set({ status: "info", measured: "the live kernels are still compiling" });
      return;
    }
    await guard(async () => {
      offsetCard.set({ status: "running" });
      const r = await offsetsVsF64(d.device, k);
      results["offsets"] = r;
      offsetCard.set({
        status: "info",
        measured: `worst ${r.worstRel.toExponential(1)}, median ${r.medianRel.toExponential(1)} relative`,
        budget: "not gated (measured)",
        adapter: d.adapter,
        notes: [`${r.members} members, ε ${sci(r.eps)}, ${r.steps} steps; the f64 ball grew ${sci(r.growth)}-fold`],
      });
    });
  }

  async function runLyapunov(): Promise<void> {
    await guard(async () => {
      for (const c of [l1Card, l2Card, sumCard]) c.set({ status: "running" });
      await new Promise((r) => setTimeout(r, 0));
      const r = lyapunovCheck();
      results["lyapunov"] = r;
      const e = r.estimate;
      const sp = e.lambdas.map((v) => v.toFixed(4)).join(", ");
      const common = [`spectrum (${sp}); Kaplan–Yorke dimension ${r.ky.toFixed(4)} (Sprott ${SPROTT.ky})`, `${e.t.toLocaleString()} time units in ${r.ms.toFixed(0)} ms`];
      l1Card.set({
        status: r.l1Err <= BUDGET.l1Abs ? "pass" : "fail",
        measured: `λ₁ = ${e.lambdas[0].toFixed(4)} (off by ${r.l1Err.toFixed(4)})`,
        budget: `|λ₁ − ${SPROTT.l1}| ≤ ${BUDGET.l1Abs}`,
        ratio: r.l1Err / BUDGET.l1Abs,
        adapter: "CPU (f64)",
        notes: common,
      });
      l2Card.set({
        status: r.l2Abs <= BUDGET.l2Abs ? "pass" : "fail",
        measured: `λ₂ = ${e.lambdas[1].toFixed(5)}`,
        budget: `|λ₂| ≤ ${BUDGET.l2Abs}`,
        ratio: r.l2Abs / BUDGET.l2Abs,
        adapter: "CPU (f64)",
        notes: common,
      });
      sumCard.set({
        status: r.sumRel <= BUDGET.sumRel ? "pass" : "fail",
        measured: `Σλ = ${(e.lambdas[0] + e.lambdas[1] + e.lambdas[2]).toFixed(6)}; −41/3 = ${(-41 / 3).toFixed(6)}; off by ${sci(r.sumRel)} relative`,
        budget: `${BUDGET.sumRel.toExponential(1)} relative`,
        ratio: r.sumRel / BUDGET.sumRel,
        adapter: "CPU (f64)",
        notes: ["The leftover is RK4's volume error at Δt = 0.01: it falls 16-fold each time Δt halves (Δt⁴)."],
      });
    });
  }

  async function runInvariant(): Promise<void> {
    const k = d.kernels();
    if (!k) {
      imCard.set({ status: "info", measured: "the live kernels are still compiling" });
      return;
    }
    await guard(async () => {
      imCard.set({ status: "running" });
      const r = await invariantMeasure(d.device, k);
      results["invariant"] = r;
      imCard.set({
        status: r.tv <= BUDGET.invariantTv ? "pass" : "fail",
        measured: `total variation ${r.tv.toFixed(4)} (two f64 runs: ${r.floor.toFixed(4)})`,
        budget: `total variation ≤ ${BUDGET.invariantTv}`,
        ratio: r.tv / BUDGET.invariantTv,
        adapter: d.adapter,
        notes: [
          `${r.members.toLocaleString()} members × ${r.snapshots} moments from t = ${r.t} against ${r.refSamples.toLocaleString()} f64 samples, ${CLASSIC_BOX.bins}×${CLASSIC_BOX.bins} bins; outside the box ${r.outside}`,
        ],
      });
    });
  }

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    await runGate();
    await runLive();
    await runOffsets();
    await runLyapunov();
    await runInvariant();
  }

  return {
    results,
    runAll,
    async measureInvariant(o) {
      const k = d.kernels();
      return k ? invariantMeasure(d.device, k, o) : null;
    },
    setOnScreen(s) {
      const classic = s.params.sigma === CLASSIC.sigma && s.params.rho === CLASSIC.rho && s.params.beta === CLASSIC.beta;
      onScreen.textContent =
        (classic ? "On screen: Lorenz's own parameters, the gated regime. " : `On screen: σ ${s.params.sigma}, ρ ${s.params.rho}, β ${s.params.beta.toFixed(3)} — outside the gated regime; the release gate always runs the classic parameters. `) +
        (s.released ? `A ball of ${s.members.toLocaleString()} members, released ${sci(s.eps)} wide.` : "No ball released yet.");
    },
  };
}

/** Run the live density kernel on one particle from the gate's start and compare with the gated trajectory. */
export async function liveVsGate(device: GPUDevice, k: ChaosKernels, gate: GateRunner): Promise<LiveCheck> {
  const ref = await gate.trajectory();
  const ic: V3 = [Math.fround(CANONICAL_IC[0] + SEED42_OFFSET[0]), Math.fround(CANONICAL_IC[1] + SEED42_OFFSET[1]), Math.fround(CANONICAL_IC[2] + SEED42_OFFSET[2])];
  const chaos = new ChaosModel(device, k, 1, 1, { ...CLASSIC });
  try {
    device.queue.writeBuffer(chaos.density.state, 0, new Float32Array([ic[0], ic[1], ic[2], 0]));
    let compared = 0;
    let firstMismatch: number | null = null;
    const check = async (step: number): Promise<void> => {
      const got = await readVec4(device, chaos.density.state);
      compared += 1;
      const same = got[0] === ref[step * 3] && got[1] === ref[step * 3 + 1] && got[2] === ref[step * 3 + 2];
      if (!same && firstMismatch === null) firstMismatch = step;
    };
    await check(0);
    for (let s = CAPTURE_INTERVAL; s <= N_STEPS; s += CAPTURE_INTERVAL) {
      runDensity(device, chaos, CAPTURE_INTERVAL);
      await check(s);
    }
    return { identical: firstMismatch === null, compared, firstMismatch };
  } finally {
    chaos.destroy();
  }
}

function runDensity(device: GPUDevice, chaos: Chaos, steps: number): void {
  // density steps only (the ensemble of one member rides along harmlessly)
  let left = steps;
  while (left > 0) {
    const n = Math.min(left, 32);
    const enc = device.createCommandEncoder({ label: "prove-live" });
    chaos.encodeSteps(enc, n);
    device.queue.submit([enc.finish()]);
    left -= n;
  }
}

async function readVec4(device: GPUDevice, buf: GPUBuffer): Promise<Float32Array> {
  const staging = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(buf, 0, staging, 0, 16);
  device.queue.submit([enc.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(staging.getMappedRange().slice(0));
  staging.destroy();
  return out;
}

/** Release a small ball, run it on the GPU, and compare 64 members with the same offsets in f64. */
export async function offsetsVsF64(device: GPUDevice, k: ChaosKernels, eps = 1e-9, steps = 1000, members = 64): Promise<OffsetCheck> {
  const p = { ...CLASSIC };
  // start on the attractor
  let x: V3 = [1, 1, 1];
  for (let i = 0; i < 2000; i += 1) x = rk4Step(p, x, 0.01).next;
  const chaos = new ChaosModel(device, k, 4096, 1, p);
  try {
    const enc = device.createCommandEncoder();
    chaos.release(enc, x, eps, 7);
    device.queue.submit([enc.finish()]);
    const start = await chaos.readEnsemble(members);
    // the same steps on the CPU, offsets in f64 from the f32 starting offsets
    const offs: V3[] = [];
    for (let i = 0; i < members; i += 1) offs.push([start[i * 4]!, start[i * 4 + 1]!, start[i * 4 + 2]!]);
    const init = offs.map((o) => Math.hypot(...o));
    let ref = x;
    let left = steps;
    while (left > 0) {
      const n = Math.min(left, 32);
      const e2 = device.createCommandEncoder();
      chaos.encodeSteps(e2, n);
      device.queue.submit([e2.finish()]);
      for (let s = 0; s < n; s += 1) {
        const r = rk4Step(p, ref, 0.01);
        for (let i = 0; i < members; i += 1) offs[i] = deviationStep(p, r.stages, offs[i]!, 0.01);
        ref = r.next;
      }
      left -= n;
    }
    const got = await chaos.readEnsemble(members);
    const rel: number[] = [];
    let growth = 0;
    for (let i = 1; i < members; i += 1) {
      const o = offs[i]!;
      const g: V3 = [got[i * 4]!, got[i * 4 + 1]!, got[i * 4 + 2]!];
      const n = Math.hypot(...o);
      rel.push(Math.hypot(g[0] - o[0], g[1] - o[1], g[2] - o[2]) / n);
      growth = Math.max(growth, n / Math.max(init[i]!, 1e-300));
    }
    rel.sort((a, b) => a - b);
    return { members: members - 1, eps, steps, worstRel: rel[rel.length - 1]!, medianRel: rel[Math.floor(rel.length / 2)]!, growth };
  } finally {
    chaos.destroy();
  }
}

/** Prove's Lyapunov run: classic parameters, from (1, 1, 1), LYAP_T time units. */
export function lyapunovCheck(): LyapunovCheck {
  const t0 = performance.now();
  const estimate = lyapunovSpectrum(CLASSIC, LYAP_T);
  const ms = performance.now() - t0;
  const tr = traceOf(CLASSIC);
  const sum = estimate.lambdas[0] + estimate.lambdas[1] + estimate.lambdas[2];
  return {
    estimate,
    l1Err: Math.abs(estimate.lambdas[0] - SPROTT.l1),
    l2Abs: Math.abs(estimate.lambdas[1]),
    sumRel: Math.abs(sum - tr) / Math.abs(tr),
    ky: kaplanYorke(estimate.lambdas),
    ms,
  };
}

/** The reference histogram (one long f64 run) and its noise floor, computed once. */
let reference: { h: ReturnType<typeof histogramXZ>; floor: number; samples: number } | null = null;
export function invariantReference(): { h: ReturnType<typeof histogramXZ>; floor: number; samples: number } {
  if (!reference) {
    const samples = 1_000_000;
    const a = referenceRun(CLASSIC, samples, 10, 2000, [1, 1, 1]);
    const b = referenceRun(CLASSIC, samples, 10, 2000, [-7, 3, 30]);
    const ha = histogramXZ(a, 3, CLASSIC_BOX);
    reference = { h: ha, floor: tvDistance(ha, histogramXZ(b, 3, CLASSIC_BOX)), samples };
  }
  return reference;
}

/**
 * The GPU ensemble's (x, z) histogram long after release vs one long f64
 * run: 262,144 members released 10⁻⁶ wide at a point on the attractor, run
 * to t = 40, then binned at eight moments 2.5 time units apart.
 */
export async function invariantMeasure(device: GPUDevice, k: ChaosKernels, o: { members?: number; t0?: number; snapshots?: number; gap?: number } = {}): Promise<InvariantCheck> {
  const members = o.members ?? 262_144;
  const t0 = o.t0 ?? 40;
  const snapshots = o.snapshots ?? 8;
  const gap = o.gap ?? 2.5;
  const p = { ...CLASSIC };
  let x: V3 = [1, 1, 1];
  for (let i = 0; i < 2350; i += 1) x = rk4Step(p, x, 0.01).next;
  const chaos = new ChaosModel(device, k, members, 1, p);
  try {
    const enc = device.createCommandEncoder();
    chaos.release(enc, x, 1e-6, 11);
    device.queue.submit([enc.finish()]);
    const run = async (steps: number): Promise<void> => {
      let left = steps;
      while (left > 0) {
        const n = Math.min(left, 32);
        const e = device.createCommandEncoder({ label: "prove-invariant" });
        chaos.encodeSteps(e, n);
        device.queue.submit([e.finish()]);
        left -= n;
      }
      await device.queue.onSubmittedWorkDone();
    };
    await run(Math.round(t0 / 0.01));
    const ref = invariantReference();
    const acc = new Float64Array(CLASSIC_BOX.bins * CLASSIC_BOX.bins);
    let outside = 0;
    for (let s = 0; s < snapshots; s += 1) {
      if (s > 0) await run(Math.round(gap / 0.01));
      const offs = await chaos.readEnsemble();
      const hgpu = histogramXZ(offs, 4, CLASSIC_BOX, chaos.ref.x);
      for (let i = 0; i < acc.length; i += 1) acc[i] += hgpu.p[i]! / snapshots;
      outside += hgpu.outside / snapshots;
    }
    const tv = tvDistance({ p: acc, outside }, ref.h);
    return { tv, floor: ref.floor, members, snapshots, outside, refSamples: ref.samples, t: t0 };
  } finally {
    chaos.destroy();
  }
}
