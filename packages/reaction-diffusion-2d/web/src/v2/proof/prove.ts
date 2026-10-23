// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. The numbers on the cards
// come from the committed data spine (src/generated/verification.json) and
// from runs on the visitor's own GPU — nothing is retyped.

import { h, plotPanel, proofCard } from "@bp/studio";
import V from "../../generated/verification.json";
import type { GateRunner } from "./gate.js";
import type { Kernel } from "../model/sim.js";
import { brusselatorJacobian, ringGrowth } from "../model/dispersion.js";
import { MODELS } from "../model/models.js";
import type { ModelId } from "../model/models.js";
import type { ModelAgreement, TuringResult } from "./model-checks.js";
import { runModelGolden, runTuringCheck } from "./model-checks.js";

const blob = (path: string): string => `${V.repo_blob_base}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  gate: GateRunner;
  /** Load the gated dish into the live view. */
  showGated: () => void;
  /** Suspend/resume the quality governor around in-page runs. */
  hold: (on: boolean) => void;
}

export interface OnScreen {
  gated: boolean;
  kernel: Kernel;
  scene: string;
  edits: number;
}

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  runAll(): Promise<void>;
  /** The extra models against their goldens (also a test hook). */
  runModels(): Promise<ModelAgreement[]>;
  /** The analytic Turing check (also a test hook). */
  runTuring(): Promise<TuringResult | null>;
}

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  const declared = `rel ${V.gate.declared.relative} · abs ${V.gate.declared.absolute}`;
  pane.append(
    h("h2", {}, "The proof"),
    h(
      "p",
      {},
      "Every release re-runs a small canonical dish in a real browser and compares it, number by number, with a " +
        "float64 Python reference. You can re-run that check here, on your own GPU.",
    ),
  );

  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);

  // 1. reference agreement (capture_roundtrip)
  const agreement = proofCard(
    {
      title: "Reference agreement",
      sentence:
        `The committed kernel runs the canonical 128 × 128 dish for ${V.canonical.step_count} steps from the seed-${V.canonical.seed} ` +
        "starting field; its final U and V must match the float64 reference within the declared budget.",
      label: "reference agreement passed",
      action: "Run on this GPU",
      links: [
        { label: "spec", href: blob(V.links.spec) },
        { label: "tolerance table", href: blob(V.links.tolerance_table) },
        { label: "gate source", href: blob(V.links.gate_source) },
        { label: "capture manifest", href: blob(V.links.capture_manifest) },
      ],
    },
    () => void runAgreement(),
  );
  agreement.set({
    status: "idle",
    measured: `${V.gate.measured_max_abs.toExponential(2)} max |Δ| in CI (RADV); run it to measure this GPU`,
    budget: `${declared} × max|field|, per field`,
    adapter: "not yet run here",
  });
  pane.append(agreement.el);

  // 2. run twice, same bytes
  const twice = proofCard(
    {
      title: "Run twice, same bytes",
      sentence: "Two full canonical runs on this GPU must produce byte-identical fields (SHA-256 of each).",
      label: "run-twice byte-identical",
      action: "Run on this GPU",
      links: [{ label: "determinism", href: blob(V.links.determinism) }],
    },
    () => void runAgreement(),
  );
  pane.append(twice.el);

  // 3. the extra models against their f64 goldens
  const M = V.models;
  const modelsCard = proofCard(
    {
      title: "Other models agree with their references",
      sentence:
        "Brusselator, Gierer–Meinhardt and FitzHugh–Nagumo each run a canonical 64 × 64 dish on this GPU from the " +
        "committed starting field, and every value must match the committed float64 golden within its budget.",
      label: "reference agreement passed",
      action: "Run on this GPU",
      links: [
        { label: "reference", href: blob(V.links.models_reference) },
        { label: "goldens", href: blob(V.links.models_goldens) },
        { label: "kernel", href: blob(V.links.models_kernel) },
        { label: "tolerance row", href: blob(V.links.tolerance_table) },
      ],
    },
    () => void runModels(),
  );
  modelsCard.set({
    status: "idle",
    measured: "run it to measure this GPU",
    budget: M.goldens.map((g) => `${MODELS[g.model as ModelId].name} ${M.tolerance.live_rel[g.model as keyof typeof M.tolerance.live_rel].toExponential(0)}`).join(" · "),
    adapter: "not yet run here",
  });
  pane.append(modelsCard.el);

  // 4. the analytic Turing check
  const T = M.turing;
  const pr = T.prediction;
  const band = M.tolerance.turing_wavenumber_rel;
  const lambda = (r: number): string => ((T.grid[0] / r) * T.params.dx).toFixed(2);
  const turingCard = proofCard(
    {
      title: "Turing instability, predicted",
      sentence:
        `Linear stability analysis of the Brusselator's uniform state (A ${T.params.F}, B ${T.params.k}) predicts which ` +
        "wavelength grows fastest. The live FFT measures every wavelength's growth rate between two snapshots of a " +
        `${T.grid[0]} × ${T.grid[1]} dish; its peak must land within ±${(band * 100).toFixed(1)}% of the prediction.`,
      label: "analytic check passed",
      action: "Run on this GPU",
      links: [
        { label: "derivation", href: blob(V.links.turing_derivation) },
        { label: "golden table", href: blob(V.links.turing_golden_table) },
        { label: "tests", href: blob(V.links.models_tests) },
        { label: "tolerance row", href: blob(V.links.tolerance_table) },
      ],
    },
    () => void runTuring(),
  );
  turingCard.set({
    status: "idle",
    measured: "run it to measure this GPU",
    budget: `r* ${pr.r_star.toFixed(2)} waves / window ±${(band * 100).toFixed(1)}%`,
    adapter: "not yet run here",
    notes: [
      `predicted fastest-growing wavelength ${lambda(pr.r_star)} length units (discrete scheme)`,
      `continuum relation: ${pr.r_star_continuum.toFixed(2)} (${(((pr.r_star_continuum - pr.r_star) / pr.r_star) * 100).toFixed(1)}%) · onset q_c: ${pr.r_c_onset.toFixed(2)}`,
    ],
  });
  const plot = plotPanel({
    title: "Growth rate per wavelength: measured vs predicted",
    xLabel: "waves / window",
    yLabel: "σ per unit time",
    height: 150,
    formatX: (v) => v.toFixed(0),
    formatY: (v) => v.toFixed(1),
  });
  const J = brusselatorJacobian(T.params.F, T.params.k);
  const rs = Array.from({ length: 121 }, (_, i) => 6 + i * 0.4);
  const predicted = { x: rs, y: rs.map((r) => ringGrowth(J, T.params.Du, T.params.Dv, T.params.dx, T.params.dt, T.grid[0], r)), color: "#9fb7d9", label: "predicted" };
  plot.set([predicted], [{ x: pr.r_star, label: "r*" }]);
  turingCard.el.append(plot.el);
  pane.append(turingCard.el);

  // 5. live honesty
  const screen = proofCard({
    title: "What's on screen",
    sentence: "",
    label: "illustrative scenario (not gated)",
  });
  const screenSentence = screen.el.querySelector(".bp-proof-sentence") as HTMLElement;
  const gatedBtn = h("button", { type: "button", class: "bp-btn" }, "Show the gated dish");
  gatedBtn.addEventListener("click", () => d.showGated());
  screen.el.append(gatedBtn);
  pane.append(screen.el);

  // the honesty arc, short
  const pm = V.postmortem;
  pane.append(
    h(
      "details",
      {},
      h("summary", {}, "The 0.074 that wasn't"),
      h(
        "p",
        {},
        `The first browser gate measured this sim drifting from the reference — ${pm.prefix_step2000_max_abs} by step 2000 — ` +
          "while still replaying byte-identically. The tolerance was not widened. The cause turned out to be a harness race " +
          `(the capture and the live loop sharing GPU state), not floating point; after the fix the browser measures ${pm.postfix_max_abs.toExponential(2)}, ` +
          "identical to native wgpu on the same GPU.",
      ),
      h(
        "p",
        { class: "bp-proof-links" },
        h("a", { href: blob(pm.audits.charter), target: "_blank", rel: "noopener" }, "charter audit"),
        " · ",
        h("a", { href: blob(pm.audits.resolution), target: "_blank", rel: "noopener" }, "resolution audit"),
      ),
    ),
  );

  let running: Promise<void> | null = null;
  async function runAgreement(): Promise<void> {
    if (running) return running;
    if (!("subtle" in crypto)) {
      twice.set({ status: "fail", notes: ["hashing needs a secure context (https or localhost)"] });
      return;
    }
    running = (async () => {
      d.hold(true);
      agreement.set({ status: "running", adapter: d.adapter });
      twice.set({ status: "running", adapter: d.adapter });
      runAllBtn.disabled = true;
      try {
        const r = await d.gate.runTwiceAndAgree((msg) => {
          agreement.set({ status: "running", notes: [msg] });
        });
        const worst = r.U.ratio > r.V.ratio ? r.U : r.V;
        agreement.set({
          status: r.pass ? "pass" : "fail",
          measured: `U ${r.U.maxAbs.toExponential(2)} · V ${r.V.maxAbs.toExponential(2)} max |Δ|`,
          budget: `U ${r.U.threshold.toExponential(2)} · V ${r.V.threshold.toExponential(2)} (${declared} × max|field|)`,
          ratio: worst.ratio,
          adapter: d.adapter,
          notes: [
            ...[r.U.invalid && `U not scored: ${r.U.invalid}`, r.V.invalid && `V not scored: ${r.V.invalid}`].filter(
              (n): n is string => !!n,
            ),
            `${(worst.ratio * 100).toFixed(1)}% of the budget · final frame (the CI gate scores all 11 captured frames)`,
            `CI measured ${V.gate.measured_max_abs.toExponential(2)} on RADV · ${r.seconds.toFixed(1)} s here`,
          ],
        });
        twice.set({
          status: r.identical ? "pass" : "fail",
          measured: r.identical ? "identical" : "different",
          budget: "byte-identical",
          ratio: r.identical ? 0 : 1.25,
          adapter: d.adapter,
          notes: [`run 1 ${r.hashes[0].slice(0, 16)}…`, `run 2 ${r.hashes[1].slice(0, 16)}…`],
        });
      } catch (e) {
        agreement.set({ status: "fail", notes: [`could not run: ${(e as Error).message}`] });
      } finally {
        d.hold(false);
        runAllBtn.disabled = false;
        running = null;
      }
    })();
    return running;
  }
  let modelsRunning: Promise<ModelAgreement[]> | null = null;
  async function runModels(): Promise<ModelAgreement[]> {
    if (modelsRunning) return modelsRunning;
    modelsRunning = (async () => {
      d.hold(true);
      modelsCard.set({ status: "running", adapter: d.adapter, notes: [] });
      const out: ModelAgreement[] = [];
      try {
        for (const g of M.goldens) {
          modelsCard.set({ status: "running", notes: [`${MODELS[g.model as ModelId].name}: ${g.steps} steps…`] });
          out.push(await runModelGolden(d.device, g));
        }
        const worst = out.reduce((a, r) => (r.worst / r.budget > a.worst / a.budget ? r : a), out[0]!);
        modelsCard.set({
          status: out.every((r) => r.pass) ? "pass" : "fail",
          measured: `worst ${worst.worst.toExponential(2)} of max |field| (${MODELS[worst.model].name})`,
          ratio: worst.worst / worst.budget,
          adapter: d.adapter,
          notes: out.map(
            (r) =>
              `${MODELS[r.model].name} · ${r.steps} steps · u ${r.u.rel.toExponential(2)} · v ${r.v.rel.toExponential(2)} · budget ${r.budget.toExponential(0)} · ${r.pass ? "pass" : "FAIL"}`,
          ),
        });
      } catch (e) {
        modelsCard.set({ status: "fail", notes: [`could not run: ${(e as Error).message}`] });
      } finally {
        d.hold(false);
        modelsRunning = null;
      }
      return out;
    })();
    return modelsRunning;
  }

  let turingRunning: Promise<TuringResult | null> | null = null;
  async function runTuring(): Promise<TuringResult | null> {
    if (turingRunning) return turingRunning;
    turingRunning = (async () => {
      d.hold(true);
      turingCard.set({ status: "running", adapter: d.adapter, notes: [`${T.protocol.t2} steps on a ${T.grid[0]} × ${T.grid[1]} dish…`] });
      try {
        const r = await runTuringCheck(d.device);
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 6; i <= 54; i += 1) {
          if (Number.isFinite(r.sigma[i]!)) {
            xs.push(i);
            ys.push(r.sigma[i]!);
          }
        }
        plot.set(
          [predicted, { x: xs, y: ys, style: "dots", color: "#e8c88f", label: "measured" }],
          [
            { x: pr.r_star, label: "r*" },
            { x: r.measured, label: "" },
          ],
        );
        turingCard.set({
          status: r.pass ? "pass" : "fail",
          measured: `peak ${r.measured.toFixed(2)} waves / window (${r.rel >= 0 ? "+" : ""}${(r.rel * 100).toFixed(2)}%)`,
          budget: `r* ${r.predicted.toFixed(2)} ±${(r.budget * 100).toFixed(1)}%`,
          ratio: Math.abs(r.rel) / r.budget,
          adapter: d.adapter,
          notes: [
            `fastest-growing wavelength: measured ${lambda(r.measured)}, predicted ${lambda(r.predicted)} length units`,
            `continuum relation ${pr.r_star_continuum.toFixed(2)} is ${(((r.measured - pr.r_star_continuum) / pr.r_star_continuum) * 100).toFixed(1)}% away — the stencil's shift is resolved`,
            `float64 reference, same protocol: worst ${(T.reference_runs.worst_abs_rel_err * 100).toFixed(2)}% over ${T.reference_runs.seeds.length} seeds · ${r.seconds.toFixed(2)} s here`,
          ],
        });
        return r;
      } catch (e) {
        turingCard.set({ status: "fail", notes: [`could not run: ${(e as Error).message}`] });
        return null;
      } finally {
        d.hold(false);
        turingRunning = null;
      }
    })();
    return turingRunning;
  }

  const runAll = async (): Promise<void> => {
    await runAgreement();
    await runModels();
    await runTuring();
  };
  runAllBtn.addEventListener("click", () => {
    runAllBtn.disabled = true;
    void runAll().finally(() => {
      runAllBtn.disabled = false;
    });
  });

  return {
    setOnScreen(s) {
      if (s.gated) {
        screenSentence.textContent =
          "The gated run itself: the committed kernel on the canonical dish, tiled to fill the screen. These are " +
          "the same numbers the gate checks.";
        screen.set({ status: "pass", measured: "gated kernel, canonical dish", budget: "—", adapter: d.adapter });
        gatedBtn.hidden = true;
      } else {
        screenSentence.textContent =
          s.kernel === "reference"
            ? `The gated kernel, taken off the gated run by ${s.edits} edit${s.edits === 1 ? "" : "s"} or a chemistry change — illustrative from here on.`
            : s.kernel === "surface"
              ? `${s.scene}: the live reaction terms on a closed surface, with the flat 5-point Laplacian replaced by the ` +
                "surface's Laplace–Beltrami operator (tested against spherical harmonics and the torus's closed form). " +
                "Not the gated run; nothing on screen is scored."
              : `${s.scene}: the live solver — the gated update rule with F and k stored per cell — on a grid shaped to your ` +
                "screen. It is not the gated run; nothing on screen is scored.";
        screen.set({
          status: "info",
          measured: s.kernel === "reference" ? "gated kernel, edited" : s.kernel === "surface" ? "live solver, on a surface" : "live solver",
          budget: "not gated",
          adapter: d.adapter,
          notes: s.edits > 0 ? [`${s.edits} edit${s.edits === 1 ? "" : "s"} since the scene started`] : [],
        });
        gatedBtn.hidden = false;
      }
    },
    runAll,
    runModels,
    runTuring,
  };
}
