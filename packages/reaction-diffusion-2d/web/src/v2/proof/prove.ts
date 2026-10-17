// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. The numbers on the cards
// come from the committed data spine (src/generated/verification.json) and
// from runs on the visitor's own GPU — nothing is retyped.

import { h, proofCard } from "@bp/studio";
import V from "../../generated/verification.json";
import type { GateRunner } from "./gate.js";

const blob = (path: string): string => `${V.repo_blob_base}${path}`;

export interface ProveDeps {
  adapter: string;
  gate: GateRunner;
  /** Load the gated dish into the live view. */
  showGated: () => void;
  /** Suspend/resume the quality governor around in-page runs. */
  hold: (on: boolean) => void;
}

export interface OnScreen {
  gated: boolean;
  kernel: "live" | "reference";
  scene: string;
  edits: number;
}

export interface ProvePane {
  setOnScreen(s: OnScreen): void;
  runAll(): Promise<void>;
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

  // 3. live honesty
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
  runAllBtn.addEventListener("click", () => void runAgreement());

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
            : `${s.scene}: the live solver — the gated update rule with F and k stored per cell — on a grid shaped to your ` +
              "screen. It is not the gated run; nothing on screen is scored.";
        screen.set({
          status: "info",
          measured: s.kernel === "reference" ? "gated kernel, edited" : "live solver",
          budget: "not gated",
          adapter: d.adapter,
          notes: s.edits > 0 ? [`${s.edits} edit${s.edits === 1 ? "" : "s"} since the scene started`] : [],
        });
        gatedBtn.hidden = false;
      }
    },
    runAll: runAgreement,
  };
}
