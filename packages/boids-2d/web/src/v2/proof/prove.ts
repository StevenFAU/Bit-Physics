// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. Every GPU check runs on its
// own scratch flock (never the live one): the kernel is the same, the shark
// is off (v4's "pure" parameters), and the numbers come from this GPU.

import { checkCountingSort } from "@bp/gpu";
import { h, proofCard } from "@bp/studio";
import type { BrainParams } from "../model/brains.js";
import type { Broadphase, FlockKernels } from "../model/flock.js";
import { BRUTE_MAX, Flock } from "../model/flock.js";
import type { RuleParams } from "../model/params.js";
import { V4_DENSITY, worldFor } from "../model/world.js";
import { REPO_BLOB } from "../learn.js";
import { OPEN_WATER_RULE, PROOF, couzinFor, sceneById, vicsekFor } from "../scenes.js";
import type { GateCheck } from "./gate.js";
import { GATE_N, GATE_RULES, GATE_STEPS, runGateTwice } from "./gate.js";
import type { EcoKernels } from "../model/ecology.js";
import type { FluidKernels } from "../model/fluid.js";
import type { ExchangeCheck, MotesCheck, ReplayCheck, RideCheck } from "./m2-proofs.js";
import { M2_CHECK, exchangeCheck, motesCheck, replayCheck, rideCheck } from "./m2-proofs.js";
import type { FieldCheck, M3Exact, MixingCheck, OrderCheck } from "./m3-proofs.js";
import { M3_CHECK, fieldCheck, fieldPass, m3Exact, mixingCheck, orderCheck } from "./m3-proofs.js";
import type { VicsekCheck } from "./vicsek-check.js";
import { VICSEK_CHECK, runVicsekCheck } from "./vicsek-check.js";

const blob = (path: string): string => `${REPO_BLOB}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  kernels: FlockKernels;
  /** M2: the water's and the ecology's pipelines. */
  fluidKernels: FluidKernels;
  ecoKernels: EcoKernels;
  /** The rule on screen (the GPU proofs run it). */
  rule: () => RuleParams;
  /** The live flock's size and world, and its sort snapshot. */
  live: () => { n: number; halfW: number; halfH: number; seed: number };
  liveSort: () => Promise<{ keys: Uint32Array; cellStart: Uint32Array; order: Uint32Array; keyCount: number; cells: number }>;
  /** The on-screen M1 brain, or null (Open Water: the v4 kernel). */
  brain: () => BrainParams | null;
  /** Load the proof flock into the live view. */
  showProof: () => void;
  /** Suspend/resume the quality governor (and the live loop) around in-page runs. */
  hold: (on: boolean) => void;
}

export interface OnScreen {
  proofRun: boolean;
  /** The on-screen scene runs an M1 or M3 brain. */
  brain: "vicsek" | "couzin" | "species" | "vision" | null;
  /** M2: the on-screen scene's water or ecology. */
  m2?: "current" | "food-chain" | null;
  scene: string;
  fish: number;
  world: [number, number];
  sharkOn: boolean;
  edited: boolean;
}

export interface HashOptions {
  n?: number;
  seed?: number;
  steps?: number;
  halfW?: number;
  halfH?: number;
  rule?: RuleParams;
  broadphase?: Broadphase;
}

export interface BruteSort {
  brute: string;
  sort: string;
  sort2: string;
  nan: number;
  saturated: boolean;
  identical: boolean;
  repeatable: boolean;
  seconds: number;
}

export interface FullScale {
  n: number;
  hashes: [string, string];
  identical: boolean;
  phiFirst: number;
  phiLast: number;
  seconds: number;
}

export interface Reorder {
  n: number;
  steps: number;
  reorders: number;
  differing: number;
  identical: boolean;
  seconds: number;
}

/** The reorder check: fish, steps, and how often the live ocean's cadence is exercised. */
export const REORDER_CHECK = { n: 65536, steps: 120, every: 8 } as const;

/** The M1 brains' exactness runs: fish, steps, seed; the re-sort check runs with noise on. */
export const BRAIN_CHECK = { vicsekN: 4096, couzinN: 2048, steps: 60, seed: 42, reorderEta: 0.3 } as const;

export interface BrainExact {
  brain: "vicsek" | "couzin";
  n: number;
  brute: string;
  sort: string;
  sort2: string;
  nan: number;
  saturated: boolean;
  identical: boolean;
  repeatable: boolean;
}

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  runAll(): Promise<void>;
  /** Test hooks (acceptance). */
  gate(): Promise<GateCheck>;
  bruteSort(): Promise<BruteSort>;
  liveSort(): Promise<{ problem: string | null; items: number; cells: number; keyCount: number }>;
  fullScale(steps?: number): Promise<FullScale>;
  reorder(): Promise<Reorder>;
  /** The M1 brains: brute ≡ sort and run twice (Vicsek and Couzin). */
  brains(): Promise<BrainExact[]>;
  /** The Vicsek brain's re-sort with noise on, fish by fish. */
  brainReorder(): Promise<Reorder>;
  /** φ(η) on the GPU against the f64 CPU reference. */
  vicsek(): Promise<VicsekCheck>;
  /** M2: motes stay spread in the solved water (and pile up in the compressible control). */
  motes(): Promise<MotesCheck>;
  /** M2: the fish ↔ water exchange conserves momentum. */
  exchange(): Promise<ExchangeCheck>;
  /** M2: with the coupling the school swims with the water. */
  ride(): Promise<RideCheck>;
  /** M2: Food Chain replays byte for byte. */
  replay(): Promise<ReplayCheck>;
  /** M3: the vision model and the species matrix — brute ≡ sort, run twice, re-sort. */
  m3Exact(): Promise<M3Exact[]>;
  /** M3: every fish's visual field against the f64 reference. */
  field(): Promise<FieldCheck>;
  /** M3: ordered motion emerges (GPU vs f64), and not without the edge terms. */
  order(): Promise<OrderCheck>;
  /** M3: the matrix sorts kinds apart or mixes them, as it says. */
  mixing(): Promise<MixingCheck>;
  /** One trajectory hash on a scratch flock (v4 hashRun), for cross-page checks. */
  hashRun(o?: HashOptions): Promise<{ hash: string; nan: number; n: number; broadphase: Broadphase }>;
}

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  pane.append(
    h("h2", {}, "The proof"),
    h(
      "p",
      {},
      "Every release re-runs a small flocking check in a real browser and requires two runs to match byte for byte. " +
        "The GPU kernel behind the million fish proves its own exactness here: the fast neighbour search must give the same trajectory, " +
        "bit for bit, as checking every pair. You can run all of it on your own GPU.",
    ),
  );
  const onScreen = h("p", { class: "sw-onscreen", role: "status" }, "");
  const showProofBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Show the proof flock");
  showProofBtn.addEventListener("click", () => d.showProof());
  pane.append(onScreen, showProofBtn);
  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);

  // 1. the release gate, as CI runs it
  const gateCard = proofCard(
    {
      title: "The release gate",
      sentence:
        `Two ${GATE_N}-fish runs of the reference rule in f64 on the CPU — calm and noisy, ${GATE_STEPS} steps — plus a small pressure-projection probe, ` +
        "built twice. The two captures must match byte for byte, order must stay in [0, 1], speed under its cap, noise must lower order, and the projection must lower the divergence.",
      label: "run-twice byte-identical",
      action: "Run on this page",
      links: [
        { label: "gate source", href: blob("tools/productization/web-deploy/verify.py") },
        { label: "capture code", href: blob("packages/boids-2d/web/src/v2/proof/gate.ts") },
      ],
    },
    () => void runGate(),
  );
  gateCard.set({ status: "idle", measured: "run it to measure", budget: `φ calm > φ noisy + ${GATE_RULES.noiseMargin}; |v| ≤ ${GATE_RULES.vmax.toFixed(6)}`, adapter: "CPU (f64)" });
  pane.append(gateCard.el);

  // 2. brute ≡ sort
  const bsCard = proofCard(
    {
      title: "Neighbour search is exact",
      sentence:
        `${PROOF.n.toLocaleString()} fish, ${PROOF.steps} steps, on the GPU twice: once checking every pair (brute force) and once with the counting-sort grid the million-fish ocean uses. ` +
        "Every position and velocity of every step must hash the same. Neighbour sums are whole numbers of 2⁻²⁰, so the order neighbours arrive in cannot change a bit.",
      label: "brute ≡ sort, byte-identical",
      action: "Run on this GPU",
      links: [{ label: "kernel", href: blob("packages/boids-2d/web/src/v2/model/kernel.ts") }],
    },
    () => void runBruteSort(),
  );
  bsCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "identical SHA-256", adapter: "not yet run here" });
  pane.append(bsCard.el);

  // 3. run twice
  const twiceCard = proofCard(
    {
      title: "Run twice, same bytes",
      sentence: `The same ${PROOF.n.toLocaleString()}-fish run again from the same seed must give the same trajectory, bit for bit, on this GPU.`,
      label: "run-twice byte-identical",
      action: "Run on this GPU",
    },
    () => void runBruteSort(),
  );
  twiceCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "identical SHA-256", adapter: "not yet run here" });
  pane.append(twiceCard.el);

  // 4. the counting sort on the live ocean
  const sortCard = proofCard(
    {
      title: "Counting sort ≡ reference",
      sentence: "The grid the live ocean uses this step — every fish bucketed by cell on the GPU — must match a plain CPU counting sort of the same cells, bucket for bucket.",
      label: "reference agreement passed",
      action: "Check the live ocean",
      links: [{ label: "shared sort", href: blob("web/gpu/src/sort.ts") }],
    },
    () => void runLiveSort(),
  );
  sortCard.set({ status: "idle", measured: "check it to read the live grid", budget: "0 buckets differ", adapter: "not yet run here" });
  pane.append(sortCard.el);

  // 5. full scale
  const scaleCard = proofCard(
    {
      title: "At full scale, run twice",
      sentence:
        "A whole ocean, from the scene's seed, run twice for 60 steps with no shark. Every step the GPU sums Σ v̂ and Σ r̂ × v̂ over every fish as exact integers; " +
        "the two series must hash the same.",
      label: "run-twice byte-identical",
      action: "Run on this GPU",
    },
    () => void runFullScale(),
  );
  scaleCard.set({ status: "idle", measured: "run it on this GPU (a few seconds)", budget: "identical SHA-256", adapter: "not yet run here" });
  pane.append(scaleCard.el);

  // 6. the live ocean's memory reorder is exact
  const reorderCard = proofCard(
    {
      title: "Re-sorting the ocean changes nothing",
      sentence:
        `For speed the live ocean moves its fish into cell order in memory every few steps. With no noise, that must leave every fish's path bit for bit as it was: ` +
        `${REORDER_CHECK.n.toLocaleString()} fish, ${REORDER_CHECK.steps} steps, re-sorted every ${REORDER_CHECK.every}, compared fish by fish with a run that never moves them.`,
      label: "byte-identical",
      action: "Run on this GPU",
    },
    () => void runReorder(),
  );
  reorderCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "0 fish differ", adapter: "not yet run here" });
  pane.append(reorderCard.el);

  pane.append(
    h("h3", {}, "The Order Dial and The Mill"),
    h(
      "p",
      { class: "sw-note" },
      "These scenes run two new brains — the Vicsek model and Couzin's zones — built the same way as the gated kernel: whole-number neighbour sums, noise keyed by seed, step and fish. The release gate does not cover them; these proofs do.",
    ),
  );

  // 7. the M1 brains: brute ≡ sort, twice
  const brainCard = proofCard(
    {
      title: "New brains: neighbour search is exact",
      sentence:
        `The Vicsek brain (${BRAIN_CHECK.vicsekN.toLocaleString()} fish) and Couzin's zones (${BRAIN_CHECK.couzinN.toLocaleString()} fish), ${BRAIN_CHECK.steps} steps each with noise on, ` +
        "run by brute force and by the counting sort, and the sort twice: every position and velocity of every step must hash the same.",
      label: "brute ≡ sort, run twice",
      action: "Run on this GPU",
      links: [{ label: "brains", href: blob("packages/boids-2d/web/src/v2/model/brains.ts") }],
    },
    () => void runBrains(),
  );
  brainCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "identical SHA-256", adapter: "not yet run here" });
  pane.append(brainCard.el);

  // 8. re-sorting with noise
  const brainReorderCard = proofCard(
    {
      title: "Re-sorting changes nothing, even with noise",
      sentence:
        `The new brains key their noise to each fish's id, which travels with the fish when the ocean is re-sorted in memory. So with noise on (η = ${BRAIN_CHECK.reorderEta}) a re-sorted Vicsek ocean — ` +
        `${REORDER_CHECK.n.toLocaleString()} fish, ${REORDER_CHECK.steps} steps, re-sorted every ${REORDER_CHECK.every} — must match one that never moves, fish by fish.`,
      label: "byte-identical",
      action: "Run on this GPU",
    },
    () => void runBrainReorder(),
  );
  brainReorderCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "0 fish differ", adapter: "not yet run here" });
  pane.append(brainReorderCard.el);

  // 9. φ(η) against the CPU reference
  const vicsekCard = proofCard(
    {
      title: "The transition matches an f64 reference",
      sentence:
        `${VICSEK_CHECK.n.toLocaleString()} fish at ρ 1, η ${VICSEK_CHECK.etas.join(", ")}: the time-averaged polarization over ${VICSEK_CHECK.gpuSeeds.length} seeds on the GPU, ` +
        `against ${VICSEK_CHECK.cpuSeeds.length} other seeds of the same rule in f64 on the CPU. Paths diverge — the flock is chaotic — so the statistics are the claim: ` +
        `at every η the two means must agree within z ≤ ${VICSEK_CHECK.zMax}. A reference shifted by Δη = ${VICSEK_CHECK.probeShift} must fail.`,
      label: "distributions agree",
      action: "Run on this GPU",
      links: [
        { label: "CPU reference", href: blob("packages/boids-2d/web/src/v2/model/vicsek-cpu.ts") },
        { label: "check", href: blob("packages/boids-2d/web/src/v2/proof/vicsek-check.ts") },
      ],
    },
    () => void runVicsek(),
  );
  vicsekCard.set({ status: "idle", measured: "run it on this GPU (a few seconds)", budget: `z ≤ ${VICSEK_CHECK.zMax}`, adapter: "not yet run here" });
  pane.append(vicsekCard.el);

  // ---- M2: Current and Food Chain ----
  pane.append(h("h3", {}, "Current and Food Chain"));
  const M = M2_CHECK;
  const motesCard = proofCard(
    {
      title: "The water does not compress",
      sentence:
        `${M.motes.n.toLocaleString()} motes ride Current's water for ${M.motes.steps.toLocaleString()} steps, stirred into eddies. In an incompressible flow they stay as evenly spread as they started: ` +
        `the index of dispersion Var(n)/⟨n⟩ over a ${M.motes.cells[0]} × ${M.motes.cells[1]} grid stays near 1, the value for random points. The control moves the same motes along the gradient of the stream function instead of its curl — the same speeds, but compressible — and must pile them up.`,
      label: "measured spread",
      action: "Run on this GPU",
      links: [{ label: "the water", href: blob("packages/boids-2d/web/src/v2/model/fluid.ts") }, { label: "check", href: blob("packages/boids-2d/web/src/v2/proof/m2-proofs.ts") }],
    },
    () => void runM2("motes"),
  );
  motesCard.set({ status: "idle", measured: "run it on this GPU", budget: `index ≤ ${M.motes.maxIndex}; control ≥ ${M.motes.controlMin}`, adapter: "not yet run here" });
  const exchangeCard = proofCard(
    {
      title: "Fish and water trade momentum exactly",
      sentence:
        `${M.exchange.n.toLocaleString()} fish frozen in a moving current (their swimming switched off), ${M.exchange.steps} coupled steps with no friction and no push. ` +
        "Every unit of momentum the fish gain, the water must lose: fb·ΣΔv of the fish against the ocean's change in mean flow, N·ΔU₀.",
      label: "momentum balance",
      action: "Run on this GPU",
      links: [{ label: "the coupling", href: blob("packages/boids-2d/web/src/v2/model/fluid.ts") }],
    },
    () => void runM2("exchange"),
  );
  exchangeCard.set({ status: "idle", measured: "run it on this GPU", budget: `imbalance ≤ ${M.exchange.maxImbalance.toExponential(0)} of the exchange`, adapter: "not yet run here" });
  const rideCard = proofCard(
    {
      title: "The school rides the current",
      sentence:
        `Current's ${M.ride.n.toLocaleString()} fish from one seed for ${M.ride.steps} steps, with the coupling and without it. Measured: how well each fish's heading matches the water's at its position (mean cosine), ` +
        "and how much energy the water ends with. Coupled, the fish must swim with the water.",
      label: "measured",
      action: "Run on this GPU",
      links: [{ label: "check", href: blob("packages/boids-2d/web/src/v2/proof/m2-proofs.ts") }],
    },
    () => void runM2("ride"),
  );
  rideCard.set({ status: "idle", measured: "run it on this GPU", budget: `alignment gain ≥ ${M.ride.minGain}`, adapter: "not yet run here" });
  const replayCard = proofCard(
    {
      title: "Food Chain replays byte for byte",
      sentence:
        `${M.replay.n.toLocaleString()} fish slots, ${M.replay.steps} steps of grazing, hunting, births and deaths from seed ${M.replay.seed}, twice (the fish turn food into fish at ε ${M.replay.efficiency}, so births happen within the run). ` +
        "The fish, the sharks and the plankton must match bit for bit — births fill empty slots in a fixed order, catches are integer keys. Another seed must differ.",
      label: "identical SHA-256",
      action: "Run on this GPU",
      links: [{ label: "the ecology", href: blob("packages/boids-2d/web/src/v2/model/ecology.ts") }],
    },
    () => void runM2("replay"),
  );
  replayCard.set({ status: "idle", measured: "run it on this GPU", budget: "identical SHA-256", adapter: "not yet run here" });
  pane.append(motesCard.el, exchangeCard.el, rideCard.el, replayCard.el);

  // ---- M3: Eyes Only and Species Matrix ----
  const K = M3_CHECK;
  pane.append(
    h("h3", {}, "Eyes Only and Species Matrix"),
    h(
      "p",
      { class: "sw-note" },
      "Two more brains: Bastien & Romanczuk's vision-only model, which ORs every fish it sees into a 256-bin picture (order-free by construction), and the species matrix, whose per-kind sums are whole numbers. The release gate does not cover them; these proofs do.",
    ),
  );
  const m3ExactCard = proofCard(
    {
      title: "Vision and species: neighbour search is exact",
      sentence:
        `The vision model (${K.exact.visionN.toLocaleString()} fish) and the species matrix (${K.exact.speciesN.toLocaleString()} fish, three kinds, noise on), ${K.exact.steps} steps each, by brute force and by the counting sort, the sort twice: every position and velocity of every step must hash the same. ` +
        `Then ${K.exact.reorderN.toLocaleString()} fish, ${K.exact.reorderSteps} steps, re-sorted in memory every ${K.exact.every}, against a run that never moves them, fish by fish.`,
      label: "brute ≡ sort, run twice, re-sort",
      action: "Run on this GPU",
      links: [{ label: "brains", href: blob("packages/boids-2d/web/src/v2/model/brains-m3.ts") }],
    },
    () => void runM3("exact"),
  );
  m3ExactCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "identical SHA-256; 0 fish differ", adapter: "not yet run here" });
  const fieldCard = proofCard(
    {
      title: "Every fish sees what the model says",
      sentence:
        `${K.field.n.toLocaleString()} fish after ${K.field.warm} steps of schooling: each one's visual field on the GPU — 256 bins all the way round — against the same field computed in f64 on the CPU from the same positions, bin for bin. ` +
        "Where a field matches, the turn and the speed change the GPU took must match the reference's step.",
      label: "measured agreement",
      action: "Run on this GPU",
      links: [{ label: "f64 reference", href: blob("packages/boids-2d/web/src/v2/model/vision-cpu.ts") }],
    },
    () => void runM3("field"),
  );
  fieldCard.set({ status: "idle", measured: "run it on this GPU", budget: `≤ ${K.field.maxDiffer.toExponential(0)} of bins; |Δψ| ≤ ${K.field.maxDpsi.toExponential(0)} rad`, adapter: "not yet run here" });
  const orderCard = proofCard(
    {
      title: "No alignment rule, and still they school",
      sentence:
        `The paper's result, reproduced: ${K.order.n} fish released in a ${5}-body-length box with random headings, ${K.order.steps.toLocaleString()} steps. Their polarization φ, averaged after step ${K.order.relax.toLocaleString()}, over ${K.order.gpuSeeds.length} seeds on the GPU and ${K.order.cpuSeeds.length} other seeds of the f64 reference: ` +
        `the two must agree (z ≤ ${K.order.zMax}) and both clear the paper's own bar for polarized, φ > ${K.order.minPhi}. The control turns the edge terms off — no pull towards what they see — and must stay below ${K.order.controlMax}.`,
      label: "distributions agree",
      action: "Run on this GPU",
      links: [{ label: "check", href: blob("packages/boids-2d/web/src/v2/proof/m3-proofs.ts") }],
    },
    () => void runM3("order"),
  );
  orderCard.set({ status: "idle", measured: "run it on this GPU (a few seconds)", budget: `z ≤ ${K.order.zMax}; φ ≥ ${K.order.minPhi}; control ≤ ${K.order.controlMax}`, adapter: "not yet run here" });
  const mixingCard = proofCard(
    {
      title: "The matrix does what it says",
      sentence:
        `${K.mixing.n.toLocaleString()} fish of ${K.mixing.kinds} kinds, ${K.mixing.steps} steps, twice: "keep apart" and "all together". Measured from the kernel's own neighbour counts: how much more of each kind's neighbours are its own kind than its share of the ocean. ` +
        `Kept apart, at least ${K.mixing.apartMin} more; all together, within ±${K.mixing.togetherMax} of a random draw.`,
      label: "measured",
      action: "Run on this GPU",
    },
    () => void runM3("mixing"),
  );
  mixingCard.set({ status: "idle", measured: "run it on this GPU", budget: `apart ≥ +${K.mixing.apartMin}; together ±${K.mixing.togetherMax}`, adapter: "not yet run here" });
  pane.append(m3ExactCard.el, fieldCard.el, orderCard.el, mixingCard.el);

  pane.append(
    h(
      "p",
      { class: "sw-note" },
      "Same GPU, same browser ⇒ same bytes. A different GPU rounds sin, cos and square roots its own way and the flock is chaotic, so across GPUs only the statistics agree — the release gate checks those on the CPU in f64.",
    ),
  );

  async function runM3(which: "exact" | "field" | "order" | "mixing"): Promise<unknown> {
    return lock(async () => {
      const card = { exact: m3ExactCard, field: fieldCard, order: orderCard, mixing: mixingCard }[which];
      card.set({ status: "running", measured: "running…", adapter: d.adapter });
      try {
        if (which === "exact") {
          const rs = await m3Exact(d.device, d.kernels);
          const ok = rs.every((r) => r.identical && r.repeatable && r.nan === 0 && r.reorder.differing === 0);
          card.set({
            status: ok ? "pass" : "fail",
            measured: ok ? "identical" : "different",
            budget: "identical SHA-256; 0 fish differ",
            ratio: ok ? 0 : 2,
            adapter: d.adapter,
            notes: rs.flatMap((r) => [
              `${r.brain}: brute ${r.brute.slice(0, 16)}… sort ${r.sort.slice(0, 16)}… — ${r.identical ? "identical" : "DIFFERENT"}, twice ${r.repeatable ? "identical" : "DIFFERENT"}`,
              `${r.brain}: ${r.reorder.reorders} re-sorts in ${r.reorder.steps} steps, ${r.reorder.differing} of ${r.reorder.n.toLocaleString()} fish differ${r.saturated ? "; fixed-point sums near saturation" : ""}`,
            ]),
          });
          return rs;
        }
        if (which === "field") {
          const r = await fieldCheck(d.device, d.kernels);
          const frac = r.differ / r.bins;
          card.set({
            status: fieldPass(r) ? "pass" : "fail",
            measured: `${r.differ} of ${r.bins.toLocaleString()} bins differ; |Δψ| ≤ ${r.maxDpsi.toExponential(1)} rad`,
            budget: `≤ ${K.field.maxDiffer.toExponential(0)} of bins; |Δψ| ≤ ${K.field.maxDpsi.toExponential(0)} rad`,
            ratio: Math.max(frac / K.field.maxDiffer, r.maxDpsi / K.field.maxDpsi),
            adapter: `${d.adapter} vs CPU (f64)`,
            notes: [
              `${r.fishDiffering} of ${r.n.toLocaleString()} fish see a bin differently (a disc's edge within float rounding of a bin's boundary)`,
              `where the fields match: largest |Δv| ${r.maxDv.toExponential(1)} per unit time`,
              `a field covers ${(r.cover * 100).toFixed(0)}% of the view on average, with ${r.edges.toFixed(1)} edges`,
              `${r.seconds.toFixed(1)} s`,
            ],
          });
          return r;
        }
        if (which === "order") {
          const r = await orderCheck(d.device, d.kernels);
          card.set({
            status: r.pass ? "pass" : "fail",
            measured: `⟨φ⟩ GPU ${r.gpuMean.toFixed(3)} · CPU ${r.cpuMean.toFixed(3)} (z ${r.z.toFixed(2)}); control ${r.controlMean.toFixed(3)}`,
            budget: `z ≤ ${K.order.zMax}; φ ≥ ${K.order.minPhi}; control ≤ ${K.order.controlMax}`,
            ratio: Math.max(r.z / K.order.zMax, K.order.minPhi / Math.max(Math.min(r.gpuMean, r.cpuMean), 1e-9), r.controlMean / K.order.controlMax),
            adapter: `${d.adapter} vs CPU (f64)`,
            notes: [
              `GPU seeds: ${r.gpu.map((x) => x.toFixed(2)).join(" ")}`,
              `CPU seeds: ${r.cpu.map((x) => x.toFixed(2)).join(" ")}`,
              `control (no edges): ${r.control.map((x) => x.toFixed(2)).join(" ")}`,
              `GPU ${r.gpuSeconds.toFixed(1)} s · CPU ${r.cpuSeconds.toFixed(1)} s`,
            ],
          });
          return r;
        }
        const r = await mixingCheck(d.device, d.kernels);
        card.set({
          status: r.pass ? "pass" : "fail",
          measured: `apart +${r.apart.toFixed(3)} · together ${r.together >= 0 ? "+" : ""}${r.together.toFixed(3)}`,
          budget: `apart ≥ +${K.mixing.apartMin}; together ±${K.mixing.togetherMax}`,
          ratio: Math.max(K.mixing.apartMin / Math.max(r.apart, 1e-9), Math.abs(r.together) / K.mixing.togetherMax),
          adapter: d.adapter,
          notes: [`${r.seconds.toFixed(1)} s`],
        });
        return r;
      } catch (e) {
        card.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  let busy = false;
  const lock = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (busy) return null;
    busy = true;
    d.hold(true);
    try {
      return await fn();
    } finally {
      d.hold(false);
      busy = false;
    }
  };

  async function runM2(which: "motes" | "exchange" | "ride" | "replay"): Promise<unknown> {
    return lock(async () => {
      const card = { motes: motesCard, exchange: exchangeCard, ride: rideCard, replay: replayCard }[which];
      card.set({ status: "running", measured: "running…", adapter: d.adapter });
      try {
        if (which === "motes") {
          const r = await motesCheck(d.device, d.fluidKernels);
          card.set({
            status: r.pass ? "pass" : "fail",
            measured: `index ${r.index.toFixed(3)} (control ${r.control.toFixed(1)})`,
            budget: `≤ ${M2_CHECK.motes.maxIndex}; control ≥ ${M2_CHECK.motes.controlMin}`,
            ratio: r.index / M2_CHECK.motes.maxIndex,
            adapter: d.adapter,
            notes: [
              `at the start ${r.start.toFixed(3)}; fastest water ${r.maxSpeed.toExponential(2)} per step`,
              `grid |∇·u| ${r.divRatio.toExponential(1)} of |∇u|; Poisson residual ${r.poisson.toExponential(1)}`,
              `${r.seconds.toFixed(1)} s`,
            ],
          });
          return r;
        }
        if (which === "exchange") {
          const r = await exchangeCheck(d.device, d.kernels, d.fluidKernels);
          card.set({
            status: r.pass ? "pass" : "fail",
            measured: `imbalance ${r.imbalance.toExponential(1)}`,
            budget: `≤ ${M2_CHECK.exchange.maxImbalance.toExponential(0)}`,
            ratio: r.imbalance / M2_CHECK.exchange.maxImbalance,
            adapter: d.adapter,
            notes: [`fish gained ${r.fishMomentum.toExponential(3)}, water ${r.waterMomentum.toExponential(3)} (node masses × units/step)`, `mean |Δv| per fish ${r.exchanged.toExponential(2)}`],
          });
          return r;
        }
        if (which === "ride") {
          const r = await rideCheck(d.device, d.kernels, d.fluidKernels);
          card.set({
            status: r.pass ? "pass" : "fail",
            measured: `alignment ${r.alignCoupled.toFixed(2)} coupled vs ${r.alignFree.toFixed(2)} free`,
            budget: `gain ≥ ${M2_CHECK.ride.minGain}`,
            ratio: M2_CHECK.ride.minGain / Math.max(r.alignCoupled - r.alignFree, 1e-9),
            adapter: d.adapter,
            notes: [`the water's mean energy: ${r.energyCoupled.toExponential(2)} coupled, ${r.energyFree.toExponential(2)} free`, `${r.seconds.toFixed(1)} s`],
          });
          return r;
        }
        const r = await replayCheck(d.device, d.kernels, d.ecoKernels);
        card.set({
          status: r.identical && r.differs && r.births > 0 ? "pass" : "fail",
          measured: r.identical ? "identical" : "differs",
          budget: "identical SHA-256",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [
            `${r.hashes[0].slice(0, 24)}…`,
            `another seed ${r.differs ? "differs" : "matches — the check has no teeth"}`,
            `${r.births} births, ${r.eaten} fish eaten; ${r.fish.toLocaleString()} fish and ${r.sharks} sharks at the end`,
            `${r.seconds.toFixed(1)} s`,
          ],
        });
        return r;
      } catch (e) {
        card.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  async function gate(): Promise<GateCheck> {
    return runGateTwice();
  }

  async function runGate(): Promise<GateCheck | null> {
    return lock(async () => {
      gateCard.set({ status: "running", measured: "building the capture twice…", adapter: "CPU (f64)" });
      await new Promise((r) => setTimeout(r, 30));
      const g = await gate();
      gateCard.set({
        status: g.pass ? "pass" : "fail",
        measured: `φ calm ${g.orderedPhi.toFixed(3)} vs noisy ${g.noisyPhi.toFixed(3)}; max |v| ${g.vmax.toFixed(6)}`,
        budget: `margin > ${GATE_RULES.noiseMargin}; |v| ≤ ${GATE_RULES.vmax.toFixed(6)}`,
        ratio: g.pass ? GATE_RULES.noiseMargin / Math.max(g.orderedPhi - g.noisyPhi, 1e-9) : 2,
        adapter: "CPU (f64)",
        notes: [
          `run 1  ${g.hashes[0].slice(0, 32)}…`,
          `run 2  ${g.hashes[1].slice(0, 32)}…`,
          `divergence ${g.divergence[0].toExponential(2)} → ${g.divergence[1].toExponential(2)}`,
          `${g.seconds.toFixed(2)} s`,
        ],
      });
      return g;
    });
  }

  async function hashRun(o: HashOptions = {}): Promise<{ hash: string; nan: number; n: number; broadphase: Broadphase; saturated: boolean }> {
    const flock = new Flock(d.device, d.kernels, {
      n: o.n ?? PROOF.n,
      halfW: o.halfW ?? PROOF.halfW,
      halfH: o.halfH ?? PROOF.halfH,
      seed: o.seed ?? PROOF.seed,
      rule: o.rule ?? d.rule(),
      broadphase: o.broadphase ?? "sort",
    });
    try {
      const r = await flock.hashRun(o.steps ?? PROOF.steps);
      const saturated = await flock.readSaturated();
      return { ...r, saturated };
    } finally {
      flock.destroy();
    }
  }

  async function bruteSort(): Promise<BruteSort> {
    const t0 = performance.now();
    if (PROOF.n > BRUTE_MAX) throw new Error("proof flock too large for brute force");
    // one rule for all three runs: a Tune edit mid-proof must not split the comparison
    const rule = { ...d.rule() };
    const b = await hashRun({ broadphase: "brute", rule });
    const s1 = await hashRun({ broadphase: "sort", rule });
    const s2 = await hashRun({ broadphase: "sort", rule });
    return {
      brute: b.hash,
      sort: s1.hash,
      sort2: s2.hash,
      nan: b.nan + s1.nan + s2.nan,
      saturated: b.saturated || s1.saturated || s2.saturated,
      identical: b.hash === s1.hash && b.nan === 0 && s1.nan === 0,
      repeatable: s1.hash === s2.hash && s2.nan === 0,
      seconds: (performance.now() - t0) / 1000,
    };
  }

  async function runBruteSort(): Promise<BruteSort | null> {
    return lock(async () => {
      bsCard.set({ status: "running", measured: "brute force, then the sort grid, then again…", adapter: d.adapter });
      twiceCard.set({ status: "running", measured: "waiting for the runs…", adapter: d.adapter });
      try {
        const r = await bruteSort();
        const sat = r.saturated ? ["fixed-point sums came near saturation: epsilon posture this run"] : ["fixed-point sums clean (flag at 2³⁰, headroom 2×)"];
        bsCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? "identical" : "different",
          budget: "identical SHA-256",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`brute  ${r.brute.slice(0, 32)}…`, `sort   ${r.sort.slice(0, 32)}…`, ...sat, `${r.seconds.toFixed(1)} s for three runs`],
        });
        twiceCard.set({
          status: r.repeatable ? "pass" : "fail",
          measured: r.repeatable ? "identical" : "different",
          budget: "identical SHA-256",
          ratio: r.repeatable ? 0 : 2,
          adapter: d.adapter,
          notes: [`run 1  ${r.sort.slice(0, 32)}…`, `run 2  ${r.sort2.slice(0, 32)}…`],
        });
        return r;
      } catch (e) {
        bsCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        twiceCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  async function liveSort(): Promise<{ problem: string | null; items: number; cells: number; keyCount: number }> {
    const s = await d.liveSort();
    return { problem: checkCountingSort(s.keys, s.keyCount, s.cellStart, s.order), items: s.keys.length, cells: s.cells, keyCount: s.keyCount };
  }

  async function runLiveSort(): Promise<void> {
    await lock(async () => {
      sortCard.set({ status: "running", measured: "reading the live grid…", adapter: d.adapter });
      try {
        const r = await liveSort();
        sortCard.set({
          status: r.problem === null ? "pass" : "fail",
          measured: r.problem === null ? `identical (${r.items.toLocaleString()} fish in ${r.cells.toLocaleString()} cells)` : r.problem,
          budget: "0 buckets differ",
          ratio: r.problem === null ? 0 : 2,
          adapter: d.adapter,
        });
      } catch (e) {
        sortCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
  }

  async function fullScale(steps = 60): Promise<FullScale> {
    const t0 = performance.now();
    // one ocean and one rule for both runs: a Tune edit mid-proof must not split the comparison
    const L = d.live();
    const rule = { ...d.rule() };
    const run = async (): Promise<{ hash: string; phi: number[] }> => {
      const flock = new Flock(d.device, d.kernels, { n: L.n, halfW: L.halfW, halfH: L.halfH, seed: L.seed, rule, broadphase: "sort" });
      try {
        return await flock.hashOrderRun(steps);
      } finally {
        flock.destroy();
      }
    };
    const a = await run();
    const b = await run();
    return {
      n: L.n,
      hashes: [a.hash, b.hash],
      identical: a.hash === b.hash,
      phiFirst: a.phi[0] ?? 0,
      phiLast: a.phi[a.phi.length - 1] ?? 0,
      seconds: (performance.now() - t0) / 1000,
    };
  }

  async function runFullScale(): Promise<void> {
    await lock(async () => {
      scaleCard.set({ status: "running", measured: "two whole-ocean runs…", adapter: d.adapter });
      try {
        const r = await fullScale();
        scaleCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? `identical (${r.n.toLocaleString()} fish)` : "different",
          budget: "identical SHA-256",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`run 1  ${r.hashes[0].slice(0, 32)}…`, `run 2  ${r.hashes[1].slice(0, 32)}…`, `φ ${r.phiFirst.toFixed(3)} → ${r.phiLast.toFixed(3)} over 60 steps`, `${r.seconds.toFixed(1)} s`],
        });
      } catch (e) {
        scaleCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
  }

  async function reorder(): Promise<Reorder> {
    const t0 = performance.now();
    const { n, steps, every } = REORDER_CHECK;
    const world = worldFor(n, 16, 9, V4_DENSITY);
    const rule = { ...d.rule(), noise: 0 };
    const mk = (sortEvery: number): Flock =>
      new Flock(d.device, d.kernels, { n, ...world, seed: PROOF.seed, rule, broadphase: "sort", sortEvery });
    const plain = mk(0);
    const sorted = mk(every);
    try {
      for (let done = 0; done < steps; ) {
        const k = Math.min(16, steps - done);
        const enc = d.device.createCommandEncoder({ label: "swarm-reorder-check" });
        plain.encodeSteps(enc, k, { pure: true });
        sorted.encodeSteps(enc, k, { pure: true });
        d.device.queue.submit([enc.finish()]);
        done += k;
      }
      const [a, b, ids] = await Promise.all([plain.readBoids(), sorted.readBoids(), sorted.readIds()]);
      const au = new Uint32Array(a.buffer, a.byteOffset, a.length);
      const bu = new Uint32Array(b.buffer, b.byteOffset, b.length);
      const seen = new Uint8Array(n);
      let differing = 0;
      for (let s = 0; s < n; s += 1) {
        const f = ids[s]!;
        if (f >= n || seen[f]) {
          differing += 1;
          continue;
        }
        seen[f] = 1;
        // position and velocity (the first 4 of 6 words) must match bit for bit
        for (let w = 0; w < 4; w += 1) {
          if (au[f * 6 + w] !== bu[s * 6 + w]) {
            differing += 1;
            break;
          }
        }
      }
      return { n, steps, reorders: sorted.reorders, differing, identical: differing === 0 && sorted.reorders > 0, seconds: (performance.now() - t0) / 1000 };
    } finally {
      plain.destroy();
      sorted.destroy();
    }
  }

  async function runReorder(): Promise<void> {
    await lock(async () => {
      reorderCard.set({ status: "running", measured: "two runs, one re-sorted…", adapter: d.adapter });
      try {
        const r = await reorder();
        reorderCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? `identical (${r.n.toLocaleString()} fish)` : `${r.differing.toLocaleString()} fish differ`,
          budget: "0 fish differ",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`${r.reorders} re-sorts in ${r.steps} steps`, `${r.seconds.toFixed(1)} s`],
        });
      } catch (e) {
        reorderCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
  }

  /** The brains at their on-screen parameters when shown, else their scenes' defaults. */
  const brainFor = (kind: "vicsek" | "couzin", n: number): BrainParams => {
    const live = d.brain();
    if (live && live.kind === kind) {
      if (kind === "couzin" && live.kind === "couzin") return { kind, p: { ...live.p, ra: couzinFor(n).ra } };
      return structuredClone(live);
    }
    return sceneById(kind === "vicsek" ? "order-dial" : "mill").brain!(n);
  };

  async function brainHash(kind: "vicsek" | "couzin", broadphase: Broadphase): Promise<{ hash: string; nan: number; saturated: boolean }> {
    const vic = kind === "vicsek";
    const n = vic ? BRAIN_CHECK.vicsekN : BRAIN_CHECK.couzinN;
    const scene = sceneById(vic ? "order-dial" : "mill");
    const world = vic ? worldFor(n, 16, 9, V4_DENSITY) : scene.world!(n, 16 / 9);
    let brain = brainFor(kind, n);
    if (vic && brain.kind === "vicsek") brain = { kind: "vicsek", p: { ...brain.p, eta: Math.max(brain.p.eta, 0.05) } };
    const flock = new Flock(d.device, d.kernels, {
      n,
      ...world,
      seed: BRAIN_CHECK.seed,
      rule: OPEN_WATER_RULE,
      brain,
      init: vic ? "random" : "annulus",
      broadphase,
    });
    try {
      const r = await flock.hashRun(BRAIN_CHECK.steps);
      return { hash: r.hash, nan: r.nan, saturated: await flock.readSaturated() };
    } finally {
      flock.destroy();
    }
  }

  async function brains(): Promise<BrainExact[]> {
    const out: BrainExact[] = [];
    for (const kind of ["vicsek", "couzin"] as const) {
      const b = await brainHash(kind, "brute");
      const s1 = await brainHash(kind, "sort");
      const s2 = await brainHash(kind, "sort");
      out.push({
        brain: kind,
        n: kind === "vicsek" ? BRAIN_CHECK.vicsekN : BRAIN_CHECK.couzinN,
        brute: b.hash,
        sort: s1.hash,
        sort2: s2.hash,
        nan: b.nan + s1.nan + s2.nan,
        saturated: b.saturated || s1.saturated || s2.saturated,
        identical: b.hash === s1.hash && b.nan === 0 && s1.nan === 0,
        repeatable: s1.hash === s2.hash && s2.nan === 0,
      });
    }
    return out;
  }

  async function runBrains(): Promise<void> {
    await lock(async () => {
      brainCard.set({ status: "running", measured: "Vicsek, then Couzin: brute force, the sort, the sort again…", adapter: d.adapter });
      const t0 = performance.now();
      try {
        const r = await brains();
        const ok = r.every((x) => x.identical && x.repeatable);
        brainCard.set({
          status: ok ? "pass" : "fail",
          measured: ok ? "identical, both brains" : r.map((x) => `${x.brain}: ${x.identical ? "brute ≡ sort" : "brute ≠ sort"}, ${x.repeatable ? "twice ≡" : "twice ≠"}`).join("; "),
          budget: "identical SHA-256",
          ratio: ok ? 0 : 2,
          adapter: d.adapter,
          notes: [
            ...r.map((x) => `${x.brain} ${x.n.toLocaleString()}  ${x.sort.slice(0, 24)}…`),
            r.some((x) => x.saturated) ? "fixed-point sums came near saturation" : "fixed-point sums clean",
            `${((performance.now() - t0) / 1000).toFixed(1)} s for six runs`,
          ],
        });
      } catch (e) {
        brainCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
  }

  async function brainReorder(): Promise<Reorder> {
    const t0 = performance.now();
    const { n, steps, every } = REORDER_CHECK;
    const world = worldFor(n, 16, 9, V4_DENSITY);
    const live = brainFor("vicsek", n);
    const p = live.kind === "vicsek" ? live.p : vicsekFor(1, BRAIN_CHECK.reorderEta);
    const brain: BrainParams = { kind: "vicsek", p: { ...p, eta: BRAIN_CHECK.reorderEta } };
    const mk = (sortEvery: number): Flock =>
      new Flock(d.device, d.kernels, { n, ...world, seed: PROOF.seed, rule: OPEN_WATER_RULE, brain, init: "random", broadphase: "sort", sortEvery });
    const plain = mk(0);
    const sorted = mk(every);
    try {
      for (let done = 0; done < steps; ) {
        const k = Math.min(16, steps - done);
        const enc = d.device.createCommandEncoder({ label: "swarm-brain-reorder-check" });
        plain.encodeSteps(enc, k, { pure: true });
        sorted.encodeSteps(enc, k, { pure: true });
        d.device.queue.submit([enc.finish()]);
        done += k;
      }
      const [a, b, ids] = await Promise.all([plain.readBoids(), sorted.readBoids(), sorted.readIds()]);
      const au = new Uint32Array(a.buffer, a.byteOffset, a.length);
      const bu = new Uint32Array(b.buffer, b.byteOffset, b.length);
      const seen = new Uint8Array(n);
      let differing = 0;
      for (let s = 0; s < n; s += 1) {
        const f = ids[s]!;
        if (f >= n || seen[f]) {
          differing += 1;
          continue;
        }
        seen[f] = 1;
        for (let w = 0; w < 4; w += 1) {
          if (au[f * 6 + w] !== bu[s * 6 + w]) {
            differing += 1;
            break;
          }
        }
      }
      return { n, steps, reorders: sorted.reorders, differing, identical: differing === 0 && sorted.reorders > 0, seconds: (performance.now() - t0) / 1000 };
    } finally {
      plain.destroy();
      sorted.destroy();
    }
  }

  async function runBrainReorder(): Promise<void> {
    await lock(async () => {
      brainReorderCard.set({ status: "running", measured: "two noisy runs, one re-sorted…", adapter: d.adapter });
      try {
        const r = await brainReorder();
        brainReorderCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? `identical (${r.n.toLocaleString()} fish, η ${BRAIN_CHECK.reorderEta})` : `${r.differing.toLocaleString()} fish differ`,
          budget: "0 fish differ",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`${r.reorders} re-sorts in ${r.steps} steps`, `${r.seconds.toFixed(1)} s`],
        });
      } catch (e) {
        brainReorderCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
  }

  async function runVicsek(): Promise<VicsekCheck | null> {
    return lock(async () => {
      vicsekCard.set({ status: "running", measured: `${VICSEK_CHECK.etas.length * VICSEK_CHECK.gpuSeeds.length} GPU runs, then the CPU reference…`, adapter: d.adapter });
      try {
        const r = await runVicsekCheck(d.device, d.kernels);
        vicsekCard.set({
          status: r.pass && r.probeFails ? "pass" : "fail",
          measured: `largest z ${r.maxZ.toFixed(2)}${r.probeFails ? "" : `; the shifted reference did not fail (z ${r.probeZ.toFixed(2)})`}`,
          budget: `z ≤ ${VICSEK_CHECK.zMax}`,
          ratio: r.maxZ / VICSEK_CHECK.zMax,
          adapter: `${d.adapter} vs CPU (f64)`,
          notes: [
            ...r.rows.map((x) => `η ${x.eta.toFixed(2)}  ⟨φ⟩ GPU ${x.gpuMean.toFixed(3)} · CPU ${x.cpuMean.toFixed(3)}  z ${x.z.toFixed(2)}`),
            `shifted reference (Δη ${VICSEK_CHECK.probeShift}): z ${r.probeZ.toFixed(1)} — ${r.probeFails ? "fails, as it must" : "passes — the check is too weak"}`,
            `GPU ${r.gpuSeconds.toFixed(1)} s · CPU ${r.cpuSeconds.toFixed(1)} s`,
          ],
        });
        return r;
      } catch (e) {
        vicsekCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        return null;
      }
    });
  }

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    runAllBtn.disabled = true;
    try {
      await runGate();
      await runBruteSort();
      await runLiveSort();
      await runFullScale();
      await runReorder();
      await runBrains();
      await runBrainReorder();
      await runVicsek();
      await runM2("motes");
      await runM2("exchange");
      await runM2("ride");
      await runM2("replay");
      await runM3("exact");
      await runM3("field");
      await runM3("order");
      await runM3("mixing");
    } finally {
      runAllBtn.disabled = false;
    }
  }

  return {
    setOnScreen(s: OnScreen) {
      const size = `${s.fish.toLocaleString()} fish on a ${s.world[0].toFixed(1)} × ${s.world[1].toFixed(1)} ocean`;
      onScreen.textContent = s.proofRun
        ? `On screen: the proofs' own run (${size}, seed ${PROOF.seed}, no shark).`
        : s.m2 === "food-chain"
          ? `On screen: Food Chain — ${size.replace("fish", "fish slots")}: the ecology's own forager kernel, not the gated one. The last card replays it; the gated kernel's proofs above check Open Water.`
          : s.m2 === "current"
            ? `On screen: Current — ${size}, the gated kernel coupled to the solved water${s.edited ? ", as you tuned it" : ""}. The Current cards check the water and the coupling on their own runs.`
            : s.brain
          ? `On screen: ${s.scene} — ${size}, the ${{ vicsek: "Vicsek brain", couzin: "Couzin brain", vision: "vision-only brain", species: "species matrix" }[s.brain]} with the counting-sort grid, its fish re-sorted in memory every 16 steps for speed. ` +
            `${s.sharkOn ? "The shark's fear term is on while you hunt; no proof runs with it. " : ""}` +
            "The new-brain proofs below run this brain at its on-screen settings; the first six check the gated kernel that runs Open Water."
          : `On screen: ${s.scene} — ${size}, the gated kernel with the counting-sort grid` +
          `${s.edited ? ", at the rule you tuned" : ""}, its fish re-sorted in memory every 16 steps for speed. ` +
          `${s.sharkOn ? "The shark's fear term is on while you hunt; no proof runs with it. " : ""}` +
          "The GPU proofs below run the same kernel and rule on their own flocks.";
      showProofBtn.hidden = s.proofRun;
    },
    runAll,
    gate,
    bruteSort,
    liveSort,
    fullScale,
    reorder,
    hashRun,
    brains,
    brainReorder,
    motes: async () => (await runM2("motes")) as MotesCheck,
    exchange: async () => (await runM2("exchange")) as ExchangeCheck,
    ride: async () => (await runM2("ride")) as RideCheck,
    replay: async () => (await runM2("replay")) as ReplayCheck,
    m3Exact: async () => (await runM3("exact")) as M3Exact[],
    field: async () => (await runM3("field")) as FieldCheck,
    order: async () => (await runM3("order")) as OrderCheck,
    mixing: async () => (await runM3("mixing")) as MixingCheck,
    vicsek: async () => {
      const r = await runVicsek();
      if (!r) throw new Error("the φ(η) check could not run");
      return r;
    },
  };
}
