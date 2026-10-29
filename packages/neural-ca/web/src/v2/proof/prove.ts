// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. Numbers come from the
// committed data spine (src/generated/verification.json) and from runs on the
// visitor's own GPU — nothing is retyped, and bit-exactness is measured and
// shown, never asserted (it is backend-conditional: verified on RADV-family
// Vulkan, where CI runs the gate).

import { h, proofCard } from "@bp/studio";
import V from "../../generated/verification.json";
import type { Checkpoint, GateProof, GateRunner } from "./gate.js";
import { CANONICAL_SEED, CANONICAL_STEPS, FIRE_RATE, GRID } from "./gate.js";
import type { FrameDiff } from "./live-vs-gated.js";
import { LiveVsGatedJob, compareFrames } from "./live-vs-gated.js";
import type { LiveKernels } from "../model/live.js";
import type { OrganismLibrary } from "../model/organisms.js";
import type { FrameScheduler } from "../runtime/scheduler.js";
import TEACH from "../../generated/teach.json";
import type { GradcheckResult } from "../teach/gradcheck.js";
import { fetchGradcheck, runGradcheck } from "../teach/gradcheck.js";
import type { TrainKernels } from "../teach/trainer.js";

const blob = (path: string): string => `${V.repo_blob_base}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  gate: GateRunner;
  kernels: LiveKernels;
  checkpoint: Checkpoint;
  library: OrganismLibrary;
  scheduler: FrameScheduler;
  /** Load the gated run into the live view. */
  showGated: () => void;
  /** Suspend/resume the quality governor around in-page runs. */
  hold: (on: boolean) => void;
  /** Teach's training pipelines (compiled after the page is up). */
  trainKernels: () => Promise<TrainKernels>;
}

export interface OnScreen {
  scene: string;
  /** The organism on the dish ("all 8 organisms" in the Menagerie). */
  organism: string;
  /** A single dish running the committed checkpoint. */
  gatedOrganism: boolean;
  /** The canonical start, seed 42, fire rate 0.5, no edits. */
  canonical: boolean;
  tick: number;
  edits: number;
  seed: number;
  fireRate: number;
}

export interface LiveVsGated extends FrameDiff {
  seconds: number;
  /** Page frames the run was spread over. */
  slices: number;
}

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  runAll(): Promise<void>;
  /** Test hooks: the same runs the cards make. */
  runGate(seed?: number): Promise<GateProof | null>;
  runLiveVsGated(): Promise<LiveVsGated | null>;
  checkWeights(): { sha: string; matches: boolean };
  checkMenagerie(): Promise<{ id: string; sha: string; matches: boolean }[]>;
  runGradcheck(): Promise<GradcheckResult | null>;
}

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  pane.append(
    h("h2", {}, "The proof"),
    h(
      "p",
      {},
      `Every release re-runs the committed network in a real browser: one seed cell, ${CANONICAL_STEPS.toLocaleString()} steps with the update chance pinned at ${FIRE_RATE} and the random mask seeded ${CANONICAL_SEED}, ` +
        `read back every 50 steps. All ${V.gate.n_frames} frames must match the committed run bit for bit — no tolerance at all. You can re-run that here, on your own GPU.`,
    ),
  );
  const onScreen = h("p", { class: "gr-onscreen", role: "status" }, "");
  const showGatedBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Show the gated run");
  showGatedBtn.addEventListener("click", () => d.showGated());
  pane.append(onScreen, showGatedBtn);
  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);

  // 1. the flagship: bit-exact against the committed run
  const exactCard = proofCard(
    {
      title: "Bit for bit on this GPU",
      sentence:
        `Re-run the gated ${CANONICAL_STEPS.toLocaleString()} steps here and compare all ${V.gate.n_frames} frames with the committed run. ` +
        "A trained network's arithmetic can round differently on another kind of GPU, so this is measured on yours, not assumed.",
      label: "bit-identical to the committed run",
      action: "Run on this GPU",
      links: [
        { label: "gate source", href: blob(V.links.gate_source) },
        { label: "capture manifest", href: blob(V.links.capture_manifest) },
        { label: "why it can differ across GPUs", href: blob(V.links.resolution_audit) },
      ],
    },
    () => void runGate(),
  );
  exactCard.set({
    status: "idle",
    measured: `${V.gate.measured_max_abs_radv.toFixed(1)} on ${V.gate.known_bitexact_family}; run it to measure this GPU`,
    budget: "max |Δ| = 0 (bit-exact)",
    adapter: "not yet run here",
  });
  const failBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, `Make it fail: seed ${CANONICAL_SEED + 1}`);
  failBtn.title = `Re-run with the random mask seeded ${CANONICAL_SEED + 1} instead of ${CANONICAL_SEED}: the frames must stop matching, so a pass above is a real test.`;
  failBtn.addEventListener("click", () => void runGate(CANONICAL_SEED + 1));
  exactCard.el.append(failBtn);
  pane.append(exactCard.el);

  // 2. run twice
  const twiceCard = proofCard(
    {
      title: "Run twice, same bytes",
      sentence: "Two full runs on this GPU must give byte-identical frames (SHA-256 of all 21). The random update mask is a hash of position, step and seed, so nothing varies between runs.",
      label: "run-twice byte-identical",
      action: "Run on this GPU",
      links: [{ label: "determinism registry", href: blob(V.links.determinism_registry) }],
    },
    () => void runGate(),
  );
  pane.append(twiceCard.el);

  // 3. the live dish is the gated kernel
  const liveCard = proofCard(
    {
      title: "The live dish is the gated kernel",
      sentence:
        "The dish you see runs the same compiled network, restructured only in how steps are submitted (a frame's steps in one pass). " +
        "Stepped through the gated run, it must match the gate's own frames on this GPU bit for bit. It runs a slice per frame while the dish keeps moving.",
      label: "byte-identical to the gated kernel",
      action: "Run on this GPU",
      links: [{ label: "gated kernel", href: blob(V.links.kernel) }],
    },
    () => void runLive(),
  );
  liveCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "0 values differ", adapter: "not yet run here" });
  pane.append(liveCard.el);

  // 4. Teach's backprop against float64 autograd
  const GC = TEACH.gradcheck;
  const gcBudget = GC.budget_rel_l2 as number | null;
  const gcCard = proofCard(
    {
      title: "Backprop on this GPU",
      sentence:
        "Teach trains the network here, with forward and backward passes written for the GPU. " +
        `On ${GC.cases.length} small fixed cases, this GPU's gradients of all ${(8320).toLocaleString()} weights are compared with float64 autograd's, committed with the page. ` +
        "It runs through the same sliced training job Teach uses, a slice per frame.",
      label: "gradients match float64",
      action: "Run on this GPU",
      links: [
        { label: "reference", href: blob(GC.generator) },
        { label: "budget", href: blob(GC.tolerance_table) },
        { label: "trainer", href: blob("packages/neural-ca/web/src/v2/teach/kernels.ts") },
      ],
    },
    () => void runGc(),
  );
  const gcBudgetText = gcBudget === null ? "not declared yet" : `relative L2 ≤ ${gcBudget.toExponential(0)}`;
  gcCard.set({ status: "idle", measured: "run it to compute this GPU's gradients", budget: gcBudgetText, adapter: "not yet run here" });
  pane.append(gcCard.el);
  let gcFixture: Promise<Awaited<ReturnType<typeof fetchGradcheck>>> | null = null;
  async function runGc(): Promise<GradcheckResult | null> {
    return lock(async () => {
      gcCard.set({ status: "running", measured: "compiling the trainer…", adapter: d.adapter });
      try {
        gcFixture ??= fetchGradcheck();
        const [fx, kernels] = await Promise.all([gcFixture, d.trainKernels()]);
        const r = await runGradcheck(d.device, kernels, d.scheduler, fx, d.checkpoint, d.library, (m) => gcCard.set({ status: "running", measured: m, adapter: d.adapter }));
        const pass = gcBudget !== null && r.worst <= gcBudget;
        gcCard.set({
          status: gcBudget === null ? "info" : pass ? "pass" : "fail",
          measured: `worst relative L2 ${r.worst.toExponential(2)}`,
          budget: gcBudgetText,
          ratio: gcBudget === null ? undefined : r.worst / gcBudget,
          adapter: d.adapter,
          notes: [
            ...r.cases.map(
              (c) =>
                `${c.name} (${c.steps} steps, batch ${c.batch}): ${c.relL2.toExponential(2)} — float32 autograd on a CPU: ${c.f32Autograd.toExponential(2)}` +
                (c.aliveCells === c.aliveCellsRef ? "" : `; living cells ${c.aliveCells} vs ${c.aliveCellsRef}`),
            ),
            `${r.seconds.toFixed(2)} s, spread over ${r.slices} page frames`,
          ],
        });
        return r;
      } catch (e) {
        gcCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  // 5. the checkpoint
  const ckCard = proofCard(
    {
      title: "The committed network",
      sentence: "The weights this page downloaded must be the committed checkpoint, byte for byte: 8,320 numbers, SHA-256 checked as they arrive.",
      label: "checkpoint matches",
    },
  );
  const checkWeights = (): { sha: string; matches: boolean } => {
    const matches = d.checkpoint.sha256 === V.model.weights_sha256;
    ckCard.set({
      status: matches ? "pass" : "fail",
      measured: `${d.checkpoint.sha256.slice(0, 16)}…`,
      budget: `${V.model.weights_sha256.slice(0, 16)}…`,
      ratio: matches ? 0 : 2,
      adapter: "your browser (SHA-256 of the download)",
      notes: [`${V.model.checkpoint} — ${V.model.regime} training, ${V.model.target} target`],
    });
    return { sha: d.checkpoint.sha256, matches };
  };
  checkWeights();
  pane.append(ckCard.el);

  // 6. the Menagerie's weights are the committed files
  const n = d.library.defs.length;
  const menCard = proofCard(
    {
      title: "The Menagerie's networks",
      sentence:
        `Each of the ${n} organisms is ${(8320).toLocaleString()} numbers in the committed checkpoint's layout, run by the same gated kernel. ` +
        "Every file this page downloads must match the SHA-256 recorded with its training run.",
      label: "every organism's weights match",
      action: "Check them",
      links: [{ label: "how they were trained", href: blob("packages/neural-ca/menagerie/README.md") }],
    },
    () => void checkMenagerie(),
  );
  menCard.set({ status: "idle", measured: "run it to fetch and check all of them", budget: `${n} of ${n} match`, adapter: "your browser" });
  pane.append(menCard.el);
  async function checkMenagerie(): Promise<{ id: string; sha: string; matches: boolean }[]> {
    menCard.set({ status: "running", measured: "fetching…", adapter: "your browser" });
    const rows: { id: string; sha: string; matches: boolean }[] = [];
    for (const def of d.library.defs) {
      try {
        const o = await d.library.get(def.id);
        rows.push({ id: def.id, sha: o.ck.sha256, matches: o.ck.sha256 === def.sha256 });
      } catch (e) {
        rows.push({ id: def.id, sha: (e as Error).message, matches: false });
      }
    }
    const ok = rows.filter((r) => r.matches).length;
    menCard.set({
      status: ok === n ? "pass" : "fail",
      measured: `${ok} of ${n} match`,
      budget: `${n} of ${n} match`,
      ratio: ok === n ? 0 : 2,
      adapter: "your browser (SHA-256 of each download)",
      notes: rows.map((r) => `${r.id}  ${r.sha.slice(0, 16)}…${r.matches ? "" : "  MISMATCH"}`),
    });
    return rows;
  }

  pane.append(
    h(
      "p",
      { class: "gr-note" },
      `Bit-exactness is backend-conditional. It holds on ${V.gate.known_bitexact_family}, where the committed run was made. ` +
        `CI's software Vulkan (lavapipe) rounds a few sums differently — ${V.postmortem.contingency.declared_short_horizon_abs.toExponential(1)} is the declared bound at step ${V.postmortem.contingency.short_horizon_step}, ten times what it measured — ` +
        "so there the release gate checks run-twice identity and that bound instead. Same organism, different last bits. The card shows what your GPU does.",
    ),
  );

  let busy = false;
  const lock = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (busy) return null;
    busy = true;
    d.hold(true);
    runAllBtn.disabled = true;
    try {
      return await fn();
    } finally {
      d.hold(false);
      runAllBtn.disabled = false;
      busy = false;
    }
  };

  let lastGateFrames: Float32Array[] | null = null;

  async function runGate(seed = CANONICAL_SEED): Promise<GateProof | null> {
    return lock(async () => {
      const perturbed = seed !== CANONICAL_SEED;
      exactCard.set({ status: "running", measured: "starting…", adapter: d.adapter });
      if (!perturbed) twiceCard.set({ status: "running", measured: "starting…", adapter: d.adapter });
      try {
        const r = await d.gate.runTwiceAndScore(seed, (msg) => {
          exactCard.set({ status: "running", measured: msg, adapter: d.adapter });
          if (!perturbed) twiceCard.set({ status: "running", measured: msg, adapter: d.adapter });
        });
        if (perturbed) {
          exactCard.set({
            status: r.maxAbs > 0 ? "info" : "fail",
            measured: `max |Δ| ${r.maxAbs.toExponential(3)} with seed ${seed}`,
            budget: "must differ from the committed run",
            ratio: r.maxAbs > 0 ? 2 : 0,
            adapter: d.adapter,
            notes: [r.maxAbs > 0 ? "Failed as it should: a different random mask is a different run, so a pass is a real test." : "Did NOT fail — something is wrong with the comparison."],
          });
          return r;
        }
        lastGateFrames = r.frames;
        exactCard.set({
          status: r.bitExact ? "pass" : "fail",
          measured: r.bitExact ? `max |Δ| 0 over ${r.frames.length} frames` : `max |Δ| ${r.maxAbs.toExponential(3)} over ${r.frames.length} frames`,
          budget: "max |Δ| = 0 (bit-exact)",
          ratio: r.bitExact ? 0 : 2,
          adapter: d.adapter,
          notes: r.bitExact
            ? [`${r.seconds.toFixed(1)} s for two runs`]
            : [
                "Not bit-identical here: same weights and code, but this GPU rounds some sums differently.",
                `It is exact on ${V.gate.known_bitexact_family}; run-twice below still has to hold here.`,
              ],
        });
        twiceCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? "identical" : "different",
          budget: "identical",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`run 1  ${r.hashes[0].slice(0, 32)}…`, `run 2  ${r.hashes[1].slice(0, 32)}…`],
        });
        return r;
      } catch (e) {
        exactCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        if (!perturbed) twiceCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  async function liveVsGated(onProgress: (m: string) => void): Promise<LiveVsGated> {
    const gated = lastGateFrames ?? (await d.gate.runRollout(CANONICAL_SEED, FIRE_RATE, (s) => onProgress(`gate path — step ${s.toLocaleString()} of ${CANONICAL_STEPS.toLocaleString()}`)));
    const t0 = performance.now();
    const job = new LiveVsGatedJob(d.device, d.kernels, d.checkpoint);
    job.onProgress = (s) => onProgress(`live solver — step ${s.toLocaleString()} of ${CANONICAL_STEPS.toLocaleString()}`);
    try {
      await d.scheduler.add(job);
      const diff = compareFrames(job.frames, gated);
      return { ...diff, seconds: (performance.now() - t0) / 1000, slices: job.slices };
    } finally {
      job.destroy();
    }
  }

  async function runLive(): Promise<LiveVsGated | null> {
    return lock(async () => {
      liveCard.set({ status: "running", measured: "starting…", adapter: d.adapter });
      try {
        const r = await liveVsGated((m) => liveCard.set({ status: "running", measured: m, adapter: d.adapter }));
        const values = (GRID * GRID * 4 * r.frames).toLocaleString();
        liveCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? `identical (${r.frames} frames, ${values} values)` : `${r.differing.toLocaleString()} values differ, max |Δ| ${r.maxAbs.toExponential(2)}`,
          budget: "0 values differ",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`${CANONICAL_STEPS.toLocaleString()} steps spread over ${r.slices} page frames (${r.seconds.toFixed(2)} s) while the dish kept running`],
        });
        return r;
      } catch (e) {
        liveCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    await runGate();
    await runLive();
    await runGc();
    checkWeights();
    await checkMenagerie();
  }

  return {
    setOnScreen(s: OnScreen) {
      const steps = `step ${s.tick.toLocaleString()}`;
      if (s.canonical && s.tick <= CANONICAL_STEPS) {
        onScreen.textContent = `On screen: the gated run itself — ${steps} of ${CANONICAL_STEPS.toLocaleString()}, from the canonical seed cell, update chance ${FIRE_RATE}, mask seed ${CANONICAL_SEED}, no edits.`;
      } else if (s.canonical) {
        onScreen.textContent = `On screen: the gated run, carried on past its ${CANONICAL_STEPS.toLocaleString()} gated steps (${steps}) with the same rule and the same random mask.`;
      } else {
        const why: string[] = [];
        if (!s.gatedOrganism) why.push(`${s.organism} (the gate runs the committed disk)`);
        if (s.scene !== "The Dish") why.push(`the ${s.scene} scene`);
        if (s.edits > 0) why.push(`${s.edits} edit${s.edits === 1 ? "" : "s"}`);
        if (s.fireRate !== FIRE_RATE) why.push(`update chance ${s.fireRate} (the gate uses ${FIRE_RATE})`);
        if (s.seed !== CANONICAL_SEED) why.push(`mask seed ${s.seed} (the gate uses ${CANONICAL_SEED})`);
        onScreen.textContent = s.gatedOrganism
          ? `On screen: the committed network and kernel with ${why.join(", ")} — ${steps}. Not the gated run.`
          : `On screen: the gated kernel running ${why.join(", ")} — ${steps}. Not the gated run.`;
      }
      showGatedBtn.hidden = s.canonical;
    },
    runAll,
    runGate: (seed) => runGate(seed),
    runLiveVsGated: () => runLive(),
    checkWeights,
    checkMenagerie,
    runGradcheck: () => runGc(),
  };
}
