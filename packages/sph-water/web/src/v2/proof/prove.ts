// Prove (00-foundation.md § 5): the release gate re-run on this GPU, the
// live solver checked against the shipped one byte for byte, and two live
// measurements of the water itself — hydrostatic pressure against ρgh and
// how far the fixed-iteration solver lets it compress — labelled
// illustrative: CI does not gate them.

import { h, plotPanel, proofCard } from "@bp/studio";
import { pct, sci } from "../format.js";
import type { HydrostaticFit } from "../model/measure.js";
import type { WaterDiagnostics } from "../model/water.js";
import type { GateCheck, GateRunner } from "./gate.js";
import { REPO_BLOB, T_SPH_REL } from "./gate.js";

export interface ProveDeps {
  adapter: string;
  gate: GateRunner;
  /** The live solver's neighbour lists against the shipped passes (null until the live view runs). */
  solverCheck: () => Promise<{ steps: number; lists: string; plain: string; shipped: string } | null>;
  /** Settle Still Water and fit pressure against depth (null until the live view runs). */
  hydrostatic: (onStatus: (s: string) => void) => Promise<HydrostaticFit | null>;
  hold: (on: boolean) => void;
}

export interface ProvePane {
  setLive(d: WaterDiagnostics, steps: number): void;
  runGate(): Promise<GateCheck | null>;
  /** The cards' last results, for tests. */
  results: Record<string, unknown>;
}

/** Bender & Koschier (2015) report volume compression below 0.01 % with their solvers iterating to tolerance. */
export const BK15_COMPRESSION = 1e-4;

export function buildProve(pane: HTMLElement, deps: ProveDeps): ProvePane {
  pane.textContent = "";
  const results: Record<string, unknown> = {};
  const links = (spec: string, extra: { label: string; href: string }[] = []): { label: string; href: string }[] => [
    { label: "spec", href: `${REPO_BLOB}${spec}` },
    ...extra,
  ];

  pane.append(
    h("h2", {}, "What is checked"),
    h(
      "p",
      { class: "wh-note" },
      "Each card re-runs a check on this GPU. The release gate is the one CI runs before this page is published; the others measure the water you are looking at.",
    ),
  );

  // ------------------------------------------------------- the release gate --
  const gateCard = proofCard(
    {
      title: "The release gate",
      sentence:
        "The committed 100,000-particle canonical replayed here twice: every 16th particle's position, velocity and SPH density at all eleven checkpoints against the committed double-precision capture, and the two runs byte-identical.",
      label: "reference agreement passed",
      action: "Run on this GPU",
      links: links("packages/sph-water/web/verification-demo-spec.md", [
        { label: "gate", href: `${REPO_BLOB}tools/productization/web-deploy/verify.py` },
        { label: "capture", href: `${REPO_BLOB}captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json` },
      ]),
    },
    () => void runGate(),
  );
  const gateNote = h(
    "p",
    { class: "wh-note" },
    "The canonical is a seeded uniform cloud in free fall (no walls, no pressure), with the verified kernel, density and neighbour search evaluated at every checkpoint — the committed Phase-1 reference. The water above goes beyond it: see the next card.",
  );
  pane.append(gateCard.el, gateNote);

  async function runGate(): Promise<GateCheck | null> {
    gateCard.set({ status: "running", adapter: deps.adapter, notes: ["Replaying…"] });
    deps.hold(true);
    try {
      const r = await deps.gate.check((s) => gateCard.set({ status: "running", adapter: deps.adapter, notes: [s] }));
      results.gate = r;
      gateCard.set({
        status: r.passed ? "pass" : "fail",
        measured: `${pct(r.worstRatio, 1)} of budget`,
        budget: `rel ${sci(T_SPH_REL, 0)} of max |field|`,
        ratio: r.worstRatio,
        adapter: deps.adapter,
        notes: [
          `worst |Δposition| ${sci(r.worst.position, 2)} m, |Δvelocity| ${sci(r.worst.velocity, 2)} m/s, |Δdensity| ${sci(r.worst.density, 2)} kg/m³`,
          `run twice: ${r.runTwiceIdentical ? "byte-identical" : "DIFFERENT"}${r.sortSaturated ? " · cell sort saturated" : ""}`,
          `${(r.ms / 1000).toFixed(1)} s on this GPU`,
        ],
      });
      return r;
    } catch (e) {
      gateCard.set({ status: "fail", adapter: deps.adapter, notes: [`Could not run: ${(e as Error).message}`] });
      return null;
    } finally {
      deps.hold(false);
    }
  }

  // --------------------------------------------- live solver ≡ shipped --
  const solverCard = proofCard(
    {
      title: "The shipped solver",
      sentence:
        "The water runs v1's DFSPH passes with each step's neighbours gathered once into lists instead of searched for in every pass, and its particles re-sorted in memory every 32 steps. From the same state, the shipped passes, the lists, and the lists with the re-sort run the same 48 steps; every particle's bytes must match.",
      label: "reference agreement passed",
      action: "Compare",
      links: links("docs/planning/rebuild-v2/08-sph-water.md", [
        { label: "solver", href: `${REPO_BLOB}packages/sph-water/src/dfsph_solver.wgsl` },
        { label: "lists", href: `${REPO_BLOB}packages/sph-water/web/src/v2/model/lists.wgsl` },
      ]),
    },
    () => void runSolver(),
  );
  pane.append(solverCard.el);

  async function runSolver(): Promise<void> {
    solverCard.set({ status: "running", adapter: deps.adapter, notes: ["Running both solvers…"] });
    const r = await deps.solverCheck();
    if (!r) {
      solverCard.set({ status: "idle", notes: ["The live view is still loading."] });
      return;
    }
    results.solver = r;
    const same = r.lists === r.shipped && r.plain === r.shipped;
    solverCard.set({
      status: same ? "pass" : "fail",
      measured: same ? "identical" : "different",
      budget: "byte-identical",
      ratio: same ? 0 : 2,
      adapter: deps.adapter,
      notes: [`${r.steps} steps · shipped ${r.shipped.slice(0, 12)}… · lists ${r.plain.slice(0, 12)}… · lists + re-sort ${r.lists.slice(0, 12)}…`],
    });
  }

  pane.append(h("h2", {}, "The water, measured"));

  // ------------------------------------------------------- hydrostatics --
  const hydroPlot = plotPanel({
    title: "Pressure against depth",
    xLabel: "depth below the surface (m)",
    yLabel: "pressure (Pa)",
    height: 140,
    formatX: (v) => v.toFixed(2),
    formatY: (v) => v.toFixed(0),
  });
  const hydroCard = proofCard(
    {
      title: "Hydrostatic pressure",
      sentence:
        "In still water the pressure the solver applies grows with depth as ρ₀ g d. The card settles Still Water, then fits each particle's pressure (ρ times its accumulated stiffness κ) against its depth.",
      label: "illustrative scenario (not gated)",
      action: "Settle and measure",
      links: links("docs/planning/rebuild-v2/08-sph-water.md"),
    },
    () => void runHydro(),
  );
  pane.append(hydroCard.el, hydroPlot.el);

  async function runHydro(): Promise<void> {
    hydroCard.set({ status: "running", adapter: deps.adapter, notes: ["Loading Still Water…"] });
    const f = await deps.hydrostatic((s) => hydroCard.set({ status: "running", adapter: deps.adapter, notes: [s] }));
    if (!f) {
      hydroCard.set({ status: "idle", notes: ["The live view is still loading."] });
      return;
    }
    results.hydrostatic = f;
    const off = Math.abs(f.ratio - 1);
    hydroCard.set({
      status: "info",
      measured: `dp/dd = ${f.slope.toFixed(0)} Pa/m (${f.ratio.toFixed(3)} × ρ₀g)`,
      budget: `ρ₀ g = ${f.expected.toFixed(0)} Pa/m`,
      ratio: off,
      adapter: deps.adapter,
      notes: [`R² ${f.r2.toFixed(4)} over ${f.count.toLocaleString()} interior particles; intercept ${f.intercept.toFixed(0)} Pa`],
    });
    hydroPlot.set([
      { x: f.bins.map((b) => b.depth), y: f.bins.map((b) => b.depth * f.expected), label: "ρ₀ g d" },
      { x: f.bins.map((b) => b.depth), y: f.bins.map((b) => b.pressure), style: "dots", label: "measured" },
    ]);
  }

  // -------------------------------------------------- incompressibility --
  const compCard = proofCard(
    {
      title: "Incompressibility, live",
      sentence:
        "How far the water is compressed, (ρ − ρ₀)/ρ₀ averaged over particles with a full neighbourhood, read back from the water on screen. The shipped recipe runs a fixed 8 density and 4 divergence iterations a step (fixed counts keep it deterministic) instead of iterating to a tolerance.",
      label: "illustrative scenario (not gated)",
      links: links("packages/sph-water/web/verification-demo-spec.md"),
    },
  );
  const compNote = h(
    "p",
    { class: "wh-note" },
    "For scale: Bender & Koschier (2015) report volume compression below 0.01 % with both of their solvers iterating to tolerance.",
  );
  pane.append(compCard.el, compNote);

  return {
    results,
    runGate,
    setLive(d: WaterDiagnostics, steps: number) {
      results.live = d;
      compCard.set({
        status: "info",
        measured: `mean ${pct(d.meanCompression, 3)} · max ${pct(d.maxCompression, 2)}`,
        budget: `none declared (fixed iterations); ${pct(BK15_COMPRESSION, 2)} iterated, for scale`,
        adapter: deps.adapter,
        notes: [
          `${d.interior.toLocaleString()} of ${d.n.toLocaleString()} particles have a full neighbourhood · step ${steps.toLocaleString()}`,
          `largest neighbour count ${d.maxNeighbours}${d.listOverflow > 0 ? ` · ${d.listOverflow} list overflows` : ""}`,
        ],
      });
    },
  };
}
