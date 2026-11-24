// Prove (00-foundation.md § 5): one ProofCard per check and "Run all on this
// GPU". The release gate is the one CI holds (verify.py _gate_boids, on the
// legacy Reynolds canonical); the starling flock's own checks — the grid
// against brute force, the scatter as a permutation — run here on your GPU.

import { h, proofCard } from "@bp/studio";
import type { Flock, FlockKernels } from "../model/flock.js";
import type { IdentityResult, PermutationResult } from "./checks.js";
import { checkScatter, gridVsBrute } from "./checks.js";
import type { GateRunner } from "./gate.js";
import { N, PARAMS, REPO_BLOB, STEPS, T_BOIDS_SHORT, T_BOIDS_VMAX_TOL, checkGate } from "./gate.js";

const blob = (path: string): string => `${REPO_BLOB}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  gate: GateRunner;
  /** The live kernels, once compiled (null while the page is still loading). */
  kernels: () => FlockKernels | null;
  /** The live flock, once running. */
  live: () => { flock: Flock } | null;
  /** Suspend/resume the governor and the live loop around in-page runs. */
  hold: (on: boolean) => void;
}

export interface ProvePane {
  /** Results of the last run, for tests. */
  results: Record<string, unknown>;
  runAll(): Promise<void>;
}

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  pane.append(
    h("h2", {}, "What is checked"),
    h(
      "p",
      {},
      "Two different things are checked here. The release gate is the one CI holds before every release: Reynolds's classic flock (1987), the project's frozen reference case, re-run in a real browser and compared with a double-precision reference. " +
        "The starling flock you are watching is a newer, richer model with no reference of its own yet; what is checked for it is that its neighbour search is exact.",
    ),
  );
  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);
  const results: Record<string, unknown> = {};

  // 1. the release gate, as CI runs it
  const gateCard = proofCard(
    {
      title: "The release gate",
      sentence:
        `${N.toLocaleString("en-US")} Reynolds boids (separation, alignment and cohesion within ${PARAMS.perception} units, speed capped at ${PARAMS.v_max}) start from the committed seed-42 state and take ${STEPS.toLocaleString("en-US")} steps of ${PARAMS.dt}, twice. ` +
        `The two runs must match byte for byte, no boid may exceed the speed cap, and at step 100 — before the flock's chaos takes over — every position must be within ${T_BOIDS_SHORT} of a double-precision reference.`,
      label: "reference agreement passed",
      action: "Run on this GPU",
      links: [
        { label: "gate source", href: blob("tools/productization/web-deploy/verify.py") },
        { label: "capture code", href: blob("packages/boids-3d/web/src/v2/proof/gate.ts") },
        { label: "kernel", href: blob("packages/boids-3d/src/boids.wgsl") },
      ],
    },
    () => void runGate(),
  );
  gateCard.set({ status: "idle", measured: "run it to measure", budget: `${T_BOIDS_SHORT} at step 100`, adapter: d.adapter });
  pane.append(gateCard.el);

  // 2. grid ≡ brute force
  const gridCard = proofCard(
    {
      title: "Grid ≡ brute force",
      sentence:
        "Each bird looks for its seven nearest visible neighbours and its single nearest bird in widening shells of grid cells, and stops as soon as the seventh is nearer than any cell it has not searched. " +
        "The same kernel with that search replaced by a look at every bird must give the same bytes, step after step — on a flock like the one on screen, on birds packed against and beyond the corner of the grid (where outliers are clamped into the edge cells), and with the falcon flying through, so the alarm spreads.",
      label: "byte-identical",
      action: "Run on this GPU",
      links: [
        { label: "flock kernel and its brute-force twin", href: blob("packages/boids-3d/web/src/v2/model/murmur.wgsl") },
        { label: "grid", href: blob("packages/boids-3d/web/src/v2/model/murmur-grid.wgsl") },
      ],
    },
    () => void runGrid(),
  );
  gridCard.set({ status: "idle", measured: "run it to measure", budget: "0 differing bits", adapter: d.adapter });
  pane.append(gridCard.el);

  // 3. the scatter drops no one
  const scatterCard = proofCard(
    {
      title: "No bird goes missing",
      sentence:
        "The grid is rebuilt every step: count the birds in each cell, add the counts up into starting places, drop each bird's id into its cell's range, then copy the birds' positions into that order for the search. " +
        "On the live flock, every id must appear exactly once, inside the range of the cell it is really in, beside its own position — no cell has a capacity, so none can overflow and lose a neighbour.",
      label: "exact",
      action: "Run on this GPU",
    },
    () => void runScatter(),
  );
  scatterCard.set({ status: "idle", measured: "run it to measure", budget: "every bird, once", adapter: d.adapter });
  pane.append(scatterCard.el);

  pane.append(
    h(
      "p",
      { class: "mm-note" },
      "The alarm wave's speed is measured in Learn (model behaviour, not gated). In CI, v1's selection rule is also checked against a double-precision reference with brute-force and grid candidates (packages/boids-3d/tests/test_starling_reference.py).",
    ),
  );

  let running = false;
  const guard = async (fn: () => Promise<void>): Promise<void> => {
    if (running) return;
    running = true;
    d.hold(true);
    try {
      await d.device.queue.onSubmittedWorkDone();
      await fn();
    } finally {
      d.hold(false);
      running = false;
    }
  };

  async function runGate(): Promise<void> {
    await guard(async () => {
      gateCard.set({ status: "running" });
      const a = await d.gate.runOnce();
      const b = await d.gate.runOnce();
      const c = await checkGate(a, b);
      results["gate"] = { ...c, sha: b.sha };
      gateCard.set({
        status: c.passed ? "pass" : "fail",
        measured: `${c.identical ? "identical" : "DIFFERENT"}; step 100 within ${c.shortAbs.toExponential(2)} (${((c.shortAbs / T_BOIDS_SHORT) * 100).toFixed(1)}% of the budget)`,
        budget: `${T_BOIDS_SHORT}; speed ≤ ${PARAMS.v_max} × (1 + ${T_BOIDS_VMAX_TOL})`,
        ratio: c.shortAbs / T_BOIDS_SHORT,
        adapter: d.adapter,
        notes: [
          `${c.checkpoints} checkpoints; fastest boid ${c.vmaxObserved.toFixed(6)} (cap ${PARAMS.v_max})`,
          `positions + velocities sha256 ${b.sha.slice(0, 16)}…`,
          "reference: the page's double-precision copy of boids_3d.reference from the committed state (CI runs the Python one)",
        ],
      });
    });
  }

  async function runGrid(): Promise<void> {
    const k = d.kernels();
    if (!k) {
      gridCard.set({ status: "info", measured: "the live kernels are still compiling" });
      return;
    }
    await guard(async () => {
      gridCard.set({ status: "running" });
      const r: IdentityResult[] = [await gridVsBrute(d.device, k, "flock"), await gridVsBrute(d.device, k, "edge"), await gridVsBrute(d.device, k, "falcon")];
      results["grid"] = r;
      const ok = r.every((x) => x.identical);
      gridCard.set({
        status: ok ? "pass" : "fail",
        measured: ok ? `${r.reduce((s, x) => s + x.steps, 0)} of ${r.reduce((s, x) => s + x.steps, 0)} steps identical` : `first difference: ${r.find((x) => !x.identical)?.fixture} at step ${r.find((x) => !x.identical)?.firstMismatch}`,
        budget: "0 differing bits",
        ratio: ok ? 0 : 1.2,
        adapter: d.adapter,
        notes: r.map((x) => `${x.fixture === "flock" ? "a flock" : x.fixture === "edge" ? "the packed corner" : "the falcon flying through"}: ${x.birds.toLocaleString("en-US")} birds × ${x.steps} steps, ${x.meanNeighbors.toFixed(2)} neighbours each${x.fixture === "falcon" ? `, ${x.alarmed} took fright` : ""}`),
      });
    });
  }

  async function runScatter(): Promise<void> {
    const live = d.live();
    if (!live) {
      scatterCard.set({ status: "info", measured: "the live flock is still loading" });
      return;
    }
    await guard(async () => {
      scatterCard.set({ status: "running" });
      const r: PermutationResult = await checkScatter(d.device, live.flock);
      results["scatter"] = r;
      scatterCard.set({
        status: r.passed ? "pass" : "fail",
        measured: r.passed ? `${r.birds.toLocaleString("en-US")} of ${r.birds.toLocaleString("en-US")} birds, each once, each in its cell` : `count ${r.countOk ? "ok" : "WRONG"}, permutation ${r.permutation ? "ok" : "BROKEN"}, cells ${r.inCell ? "ok" : "WRONG"}, starts ${r.scanOk ? "ok" : "WRONG"}, gather ${r.gatherOk ? "ok" : "WRONG"}`,
        budget: "every bird, once",
        ratio: r.passed ? 0 : 1.2,
        adapter: d.adapter,
        notes: [`${r.occupiedCells.toLocaleString("en-US")} occupied cells; the fullest holds ${r.maxOccupancy}`],
      });
    });
  }

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    await runGate();
    await runGrid();
    await runScatter();
  }

  return { results, runAll };
}
