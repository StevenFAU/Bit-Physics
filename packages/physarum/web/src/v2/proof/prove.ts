// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. Numbers come from the
// committed data spine (src/generated/verification.json) and from runs on
// the visitor's own GPU — nothing is retyped.

import { h, proofCard } from "@bp/studio";
import V from "../../generated/verification.json";
import type { GateRunner } from "./gate.js";
import type { JonesParams } from "./gate.js";
import { H, NA, PARAMS, STEPS, W, fetchCanonicalIC } from "./gate.js";
import { LiveKernels, LiveSim } from "../model/sim.js";

const blob = (path: string): string => `${V.repo_blob_base}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  gate: GateRunner;
  kernels: LiveKernels;
  /** Load the gated dish into the live view. */
  showGated: () => void;
  /** Suspend/resume the quality governor around in-page runs. */
  hold: (on: boolean) => void;
  /** Mass of the live trail now, its closed-form equilibrium, and steps since the parameters last changed. */
  liveMass: () => Promise<{ mass: number; equilibrium: number; tick: number; settledSteps: number }>;
}

export interface OnScreen {
  gated: boolean;
  scene: string;
  agents: number;
  grid: [number, number];
  /** The parameters on screen (compared with Jones 2010 Table 1, the gated ones). */
  params: JonesParams;
}

export interface LiveVsGated {
  identical: boolean;
  cellsDiffering: number;
  maxAbs: number;
  sorts: number;
}

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  runAll(): Promise<void>;
  /** The live solver against the gated kernel on the canonical run (also a test hook). */
  runLiveVsGated(): Promise<LiveVsGated>;
  /** The live mass check (also a test hook). */
  runLiveMass(): Promise<{ massRel: number; pass: boolean } | null>;
}

const PARAM_NAMES: [keyof JonesParams, string, string][] = [
  ["delta_phi_deg", "turn angle", "°"],
  ["L_sense", "sensor reach", ""],
  ["L_move", "step", ""],
  ["deposit", "deposit", ""],
  ["decay_alpha", "fade", ""],
];

/** "at the gated parameters", or which values differ: "at sensor reach 18 (the gate uses 9)". */
function paramsVsGated(p: JonesParams): string {
  const diff = PARAM_NAMES.filter(([k]) => p[k] !== PARAMS[k]).map(([k, name, unit]) => `${name} ${p[k]}${unit} (the gate uses ${PARAMS[k]}${unit})`);
  return diff.length === 0 ? "at the gated parameters" : `at ${diff.join(", ")}`;
}

/** Settling: the mass relaxes as (1−α)^k; after this many steps the residue is < 1e-13 of it. */
const SETTLED = 300;

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  const eq = V.mass_equilibrium.canonical_value;
  const thr = V.gate.mass_rel_threshold;
  pane.append(
    h("h2", {}, "The proof"),
    h(
      "p",
      {},
      "Every release re-runs a small canonical dish in a real browser: 500 agents on 256 × 256 for 5,000 steps from a committed start. " +
        "Two runs must match byte for byte, and the trail must hold exactly the mass the model predicts. You can re-run that check here, on your own GPU.",
    ),
  );
  const onScreen = h("p", { class: "ph-onscreen", role: "status" }, "");
  const showGatedBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Show the gated dish");
  showGatedBtn.addEventListener("click", () => d.showGated());
  pane.append(onScreen, showGatedBtn);

  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);

  // 1. the gate's mass invariant
  const massCard = proofCard(
    {
      title: "Mass balance",
      sentence:
        `Each step every agent deposits d = ${PARAMS.deposit}, and the trail diffuses and decays by α = ${PARAMS.decay_alpha}. ` +
        `So after ${STEPS.toLocaleString()} steps the trail must hold d·N·(1−α)/α = ${eq.toLocaleString()} units, to within ${thr} of that.`,
      label: "analytic check passed",
      action: "Run on this GPU",
      links: [
        { label: "derivation", href: blob(V.links.algebraic) },
        { label: "gate source", href: blob(V.links.gate_source) },
        { label: "capture manifest", href: blob(V.links.capture_manifest) },
        { label: "perf ledger", href: blob(V.links.perf_ledger) },
      ],
    },
    () => void runGate(),
  );
  massCard.set({
    status: "idle",
    measured: `${V.gate.recorded_browser.total_mass} in CI (${V.gate.recorded_browser.backend}); run it to measure this GPU`,
    budget: `|M − ${eq.toLocaleString()}| / ${eq.toLocaleString()} < ${thr}`,
    adapter: "not yet run here",
  });
  pane.append(massCard.el);

  // 2. run twice, same bytes
  const twiceCard = proofCard(
    {
      title: "Run twice, same bytes",
      sentence:
        "Two full canonical runs on this GPU must give byte-identical trails (SHA-256 of each). The deposit is integer atomics, " +
        "so the order agents land in cannot change a single bit.",
      label: "run-twice byte-identical",
      action: "Run on this GPU",
      links: [{ label: "why the field differs across GPUs", href: blob(V.links.resolution_audit) }],
    },
    () => void runGate(),
  );
  pane.append(twiceCard.el);

  // 3. the live solver is the gated kernel
  const liveCard = proofCard(
    {
      title: "The live solver is the gated kernel",
      sentence:
        "The 2-million-agent solver is the gated kernel restructured for speed: packed agents, one fused pass, agents re-sorted by tile. " +
        "Run on the canonical dish it must give the gated kernel's trail exactly, re-sorting included.",
      label: "byte-identical to the gated kernel",
      action: "Run on this GPU",
      links: [{ label: "gated kernel", href: blob(V.links.kernel) }],
    },
    () => void runLive(),
  );
  liveCard.set({ status: "idle", measured: "run it to compare on this GPU", budget: "0 cells differ", adapter: "not yet run here" });
  pane.append(liveCard.el);

  // 4. the invariant at full scale, on the live view
  const scaleCard = proofCard(
    {
      title: "Mass balance at full scale",
      sentence:
        "The same closed form holds for the dish on screen: its trail must hold d·N·(1−α)/α for its own N, " +
        "once it has settled after the last parameter change.",
      label: "analytic check passed",
      action: "Check the live dish",
    },
    () => void runLiveMass(),
  );
  scaleCard.set({ status: "idle", measured: "check it to read the live trail", budget: `relative error < ${thr}`, adapter: "not yet run here" });
  pane.append(scaleCard.el);

  pane.append(
    h(
      "p",
      { class: "ph-note" },
      V.gate.cross_hw_note.charAt(0).toUpperCase() + V.gate.cross_hw_note.slice(1) + ".",
    ),
  );

  let busy = false;
  const lock = async (fn: () => Promise<void>): Promise<void> => {
    if (busy) return;
    busy = true;
    d.hold(true);
    try {
      await fn();
    } finally {
      d.hold(false);
      busy = false;
    }
  };

  async function runGate(): Promise<void> {
    await lock(async () => {
      massCard.set({ status: "running", measured: "starting…", adapter: d.adapter });
      twiceCard.set({ status: "running", measured: "starting…", adapter: d.adapter });
      try {
        const r = await d.gate.runTwiceAndAgree((msg) => {
          massCard.set({ status: "running", measured: msg, adapter: d.adapter });
          twiceCard.set({ status: "running", measured: msg, adapter: d.adapter });
        });
        const massOk = r.massRel < thr && Number.isFinite(r.mass);
        massCard.set({
          status: massOk ? "pass" : "fail",
          measured: `M = ${r.mass.toFixed(4)} (relative error ${r.massRel.toExponential(2)})`,
          budget: `< ${thr}`,
          ratio: r.massRel / thr,
          adapter: d.adapter,
          notes: [`${r.seconds.toFixed(1)} s for two runs`],
        });
        twiceCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? "identical" : "different",
          budget: "identical",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`run 1  ${r.hashes[0].slice(0, 32)}…`, `run 2  ${r.hashes[1].slice(0, 32)}…`],
        });
      } catch (e) {
        massCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
        twiceCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
  }

  async function liveVsGated(onProgress?: (m: string) => void): Promise<LiveVsGated> {
    const gated = await d.gate.runCanonicalTrail((done, total) => onProgress?.(`gated kernel — step ${done.toLocaleString()} of ${total.toLocaleString()}`));
    const ic = await fetchCanonicalIC();
    const packed = new Float32Array(NA * 4);
    for (let i = 0; i < NA; i += 1) {
      packed.set([ic.pos[i * 2]!, ic.pos[i * 2 + 1]!, ic.head[i * 2]!, ic.head[i * 2 + 1]!], i * 4);
    }
    // the gated arithmetic (long-run mode off), re-sorting every 64 steps
    const sim = new LiveSim(d.device, d.kernels, { w: W, h: H, n: NA, params: PARAMS, longRun: false, sortEvery: 64 });
    try {
      sim.load(packed);
      let done = 0;
      while (done < STEPS) {
        const k = Math.min(200, STEPS - done);
        const enc = d.device.createCommandEncoder({ label: "live-vs-gated" });
        // encodeSteps sorts at most once per call; 200-step chunks keep the cadence at 64
        for (let s = 0; s < k; s += 1) sim.encodeSteps(enc, 1);
        d.device.queue.submit([enc.finish()]);
        await d.device.queue.onSubmittedWorkDone();
        done += k;
        onProgress?.(`live solver — step ${done.toLocaleString()} of ${STEPS.toLocaleString()}`);
      }
      const live = await sim.readTrail();
      let differ = 0;
      let maxAbs = 0;
      const gb = new Uint32Array(gated.buffer, gated.byteOffset, gated.length);
      const lb = new Uint32Array(live.buffer, live.byteOffset, live.length);
      for (let x = 0; x < W; x += 1) {
        for (let y = 0; y < H; y += 1) {
          const gi = x * H + y; // gated: x-major
          const li = y * W + x; // live: row-major
          if (gb[gi] !== lb[li]) {
            differ += 1;
            maxAbs = Math.max(maxAbs, Math.abs(gated[gi]! - live[li]!));
          }
        }
      }
      return { identical: differ === 0, cellsDiffering: differ, maxAbs, sorts: sim.sorts };
    } finally {
      sim.destroy();
    }
  }

  async function runLive(): Promise<LiveVsGated | null> {
    let out: LiveVsGated | null = null;
    await lock(async () => {
      liveCard.set({ status: "running", measured: "starting…", adapter: d.adapter });
      try {
        const r = await liveVsGated((m) => liveCard.set({ status: "running", measured: m, adapter: d.adapter }));
        out = r;
        liveCard.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? `identical (${(W * H).toLocaleString()} cells)` : `${r.cellsDiffering.toLocaleString()} cells differ, max |Δ| ${r.maxAbs.toExponential(2)}`,
          budget: "0 cells differ",
          ratio: r.identical ? 0 : 2,
          adapter: d.adapter,
          notes: [`${r.sorts} re-sorts during the run`],
        });
      } catch (e) {
        liveCard.set({ status: "fail", measured: `could not run: ${(e as Error).message}`, adapter: d.adapter });
      }
    });
    return out;
  }

  async function runLiveMass(): Promise<{ massRel: number; pass: boolean } | null> {
    try {
      const r = await d.liveMass();
      if (r.settledSteps < SETTLED) {
        scaleCard.set({
          status: "info",
          measured: `settling — ${r.settledSteps} of ${SETTLED} steps since the last change`,
          budget: `relative error < ${thr}`,
          adapter: d.adapter,
        });
        return null;
      }
      const massRel = Math.abs(r.mass - r.equilibrium) / r.equilibrium;
      const pass = Number.isFinite(r.mass) && massRel < thr;
      scaleCard.set({
        status: pass ? "pass" : "fail",
        measured: `M = ${r.mass.toExponential(6)} vs ${r.equilibrium.toExponential(6)} (relative error ${massRel.toExponential(2)})`,
        budget: `< ${thr}`,
        ratio: massRel / thr,
        adapter: d.adapter,
        notes: [`at step ${r.tick.toLocaleString()}`],
      });
      return { massRel, pass };
    } catch (e) {
      scaleCard.set({ status: "fail", measured: `could not read: ${(e as Error).message}`, adapter: d.adapter });
      return null;
    }
  }

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    runAllBtn.disabled = true;
    try {
      await runGate();
      await runLive();
      await runLiveMass();
    } finally {
      runAllBtn.disabled = false;
    }
  }

  return {
    setOnScreen(s: OnScreen) {
      const size = `${s.agents.toLocaleString()} agents on ${s.grid[0]} × ${s.grid[1]}`;
      onScreen.textContent = s.gated
        ? `On screen: the gated run itself (${size}, canonical parameters, no edits).`
        : `On screen: ${s.scene} — ${size}. The gated kernel's arithmetic ${paramsVsGated(s.params)}; ` +
          "for hours-long runs positions wrap back into the dish and headings are renormalised after each turn, so it is not the gated run.";
      showGatedBtn.hidden = s.gated;
    },
    runAll,
    async runLiveVsGated() {
      return (await runLive()) ?? liveVsGated();
    },
    runLiveMass,
  };
}
