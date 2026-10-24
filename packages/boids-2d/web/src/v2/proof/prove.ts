// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. Every GPU check runs on its
// own scratch flock (never the live one): the kernel is the same, the shark
// is off (v4's "pure" parameters), and the numbers come from this GPU.

import { checkCountingSort } from "@bp/gpu";
import { h, proofCard } from "@bp/studio";
import type { Broadphase, FlockKernels } from "../model/flock.js";
import { BRUTE_MAX, Flock } from "../model/flock.js";
import type { RuleParams } from "../model/params.js";
import { V4_DENSITY, worldFor } from "../model/world.js";
import { REPO_BLOB } from "../learn.js";
import { PROOF } from "../scenes.js";
import type { GateCheck } from "./gate.js";
import { GATE_N, GATE_RULES, GATE_STEPS, runGateTwice } from "./gate.js";

const blob = (path: string): string => `${REPO_BLOB}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  kernels: FlockKernels;
  /** The rule on screen (the GPU proofs run it). */
  rule: () => RuleParams;
  /** The live flock's size and world, and its sort snapshot. */
  live: () => { n: number; halfW: number; halfH: number; seed: number };
  liveSort: () => Promise<{ keys: Uint32Array; cellStart: Uint32Array; order: Uint32Array; keyCount: number; cells: number }>;
  /** Load the proof flock into the live view. */
  showProof: () => void;
  /** Suspend/resume the quality governor (and the live loop) around in-page runs. */
  hold: (on: boolean) => void;
}

export interface OnScreen {
  proofRun: boolean;
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

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  runAll(): Promise<void>;
  /** Test hooks (acceptance). */
  gate(): Promise<GateCheck>;
  bruteSort(): Promise<BruteSort>;
  liveSort(): Promise<{ problem: string | null; items: number; cells: number; keyCount: number }>;
  fullScale(steps?: number): Promise<FullScale>;
  reorder(): Promise<Reorder>;
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
    h(
      "p",
      { class: "sw-note" },
      "Same GPU, same browser ⇒ same bytes. A different GPU rounds sin, cos and square roots its own way and the flock is chaotic, so across GPUs only the statistics agree — the release gate checks those on the CPU in f64.",
    ),
  );

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
    const b = await hashRun({ broadphase: "brute" });
    const s1 = await hashRun({ broadphase: "sort" });
    const s2 = await hashRun({ broadphase: "sort" });
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
    const L = d.live();
    const run = async (): Promise<{ hash: string; phi: number[] }> => {
      const flock = new Flock(d.device, d.kernels, { n: L.n, halfW: L.halfW, halfH: L.halfH, seed: L.seed, rule: d.rule(), broadphase: "sort" });
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

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    runAllBtn.disabled = true;
    try {
      await runGate();
      await runBruteSort();
      await runLiveSort();
      await runFullScale();
      await runReorder();
    } finally {
      runAllBtn.disabled = false;
    }
  }

  return {
    setOnScreen(s: OnScreen) {
      const size = `${s.fish.toLocaleString()} fish on a ${s.world[0].toFixed(1)} × ${s.world[1].toFixed(1)} ocean`;
      onScreen.textContent = s.proofRun
        ? `On screen: the proofs' own run (${size}, seed ${PROOF.seed}, no shark).`
        : `On screen: ${s.scene} — ${size}, the gated kernel with the counting-sort grid` +
          `${s.edited ? ", at the rule you tuned" : ""}. ` +
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
  };
}
