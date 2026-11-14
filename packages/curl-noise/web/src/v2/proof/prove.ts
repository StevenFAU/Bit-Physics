// Prove (00-foundation.md § 5): one ProofCard per check, "Run all on this
// GPU", and live honesty about what is on screen. The release gate is the
// one CI holds; the identities below it are measured here and labelled
// illustrative — CI gates them in double precision on the CPU
// (verify.py _gate_curl_noise: matched DIV∘CURL and the confinement
// identities), not on the visitor's GPU.

import { h, proofCard } from "@bp/studio";
import { sci } from "../format.js";
import type { FieldParams, FlowKernels } from "../model/flow.js";
import { Flow, isCanonical, measureInstruments } from "../model/flow.js";
import type { GateCheck, GateIc, GateRunner } from "./gate.js";
import { GATE_IC_SHA256, REPO_BLOB, T_CURL_REL, checkGate, loadGateIc } from "./gate.js";

const blob = (path: string): string => `${REPO_BLOB}${path}`;

export interface ProveDeps {
  adapter: string;
  device: GPUDevice;
  gate: GateRunner;
  /** The live kernels, once compiled (null while the page is still loading). */
  kernels: () => FlowKernels | null;
  /** The field on screen and its clock. */
  field: () => { params: FieldParams; time: number } | null;
  /** Suspend/resume the governor and the live loop around in-page runs. */
  hold: (on: boolean) => void;
}

export interface ProvePane {
  setOnScreen(params: FieldParams): void;
  /** Results of the last run, for tests. */
  results: Record<string, unknown>;
  runAll(): Promise<void>;
}

/** The live kernel on the gate's initial condition: the gate's bytes? */
export interface LiveCheck {
  identical: boolean;
  compared: number;
  firstMismatch: number | null;
  tracers: number;
}

/** The gate's field as the live model's parameters. */
export function fieldOfIc(ic: GateIc): FieldParams {
  const P = ic.params;
  return {
    ell0: P.ell0,
    octaves: P.octaves,
    gain: P.gain,
    lacunarity: P.lacunarity,
    amplitude: P.amplitude,
    obstacle: { centre: [...P.obstacle_center], radius: P.obstacle_radius, ramp: P.obstacle_ramp_width, noiseAmp: P.obstacle_noise_amp },
    evolution: 0,
  };
}

/**
 * Run the live kernel (respawn off, reprojection on, no ribbon) on the
 * committed initial condition for the gate's 64 steps, each step its own
 * submit, and compare every checkpoint with the gated run byte for byte.
 */
export async function liveVsGate(device: GPUDevice, k: FlowKernels, gate: GateRunner): Promise<LiveCheck> {
  const ic = await loadGateIc();
  const ref = await gate.runOnce(ic);
  const n = ic.params.tracers;
  const flow = new Flow(device, k, n, 0, fieldOfIc(ic));
  try {
    flow.respawn = false;
    flow.dt = ic.params.dt;
    const pos = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) pos.set([ic.positions[i * 3]!, ic.positions[i * 3 + 1]!, ic.positions[i * 3 + 2]!, 0], i * 4);
    device.queue.writeBuffer(flow.tracers, 0, pos);
    const e0 = device.createCommandEncoder();
    flow.encodeAnchor(e0);
    device.queue.submit([e0.finish()]);
    let compared = 0;
    let firstMismatch: number | null = null;
    const check = async (step: number, at: number): Promise<void> => {
      const got = await flow.readTracers();
      const want = ref.steps[at]!.state["positions"]!.data;
      compared += 1;
      for (let i = 0; i < n && firstMismatch === null; i += 1) {
        for (let c = 0; c < 3; c += 1) {
          if (got[i * 4 + c] !== want[i * 3 + c]) {
            firstMismatch = step;
            break;
          }
        }
      }
    };
    await check(0, 0);
    let at = 1;
    for (let s = 1; s <= ic.params.steps; s += 1) {
      const enc = device.createCommandEncoder();
      flow.encodeSteps(enc, 1);
      device.queue.submit([enc.finish()]);
      if (s % ic.params.capture_interval === 0 || s === ic.params.steps) await check(s, at++);
    }
    return { identical: firstMismatch === null, compared, firstMismatch, tracers: n };
  } finally {
    flow.destroy();
  }
}

export function buildProve(pane: HTMLElement, d: ProveDeps): ProvePane {
  pane.textContent = "";
  pane.append(
    h("h2", {}, "What is checked"),
    h(
      "p",
      {},
      "This flow is built so that it cannot compress: its velocity is the cross product of two gradients, and the divergence of any such product is exactly zero. " +
        "What a GPU can get wrong is the arithmetic. So the release gate re-runs the gated scene in a real browser before every release and checks the result against a double-precision reference; " +
        "and the identities that make the flow exact are measured here, on your GPU.",
    ),
  );
  const onScreen = h("p", { class: "fs-onscreen", role: "status" }, "");
  pane.append(onScreen);
  const runAllBtn = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Run all on this GPU");
  pane.append(runAllBtn);
  const results: Record<string, unknown> = {};
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

  // 1. the release gate, as CI runs it
  const gateCard = proofCard(
    {
      title: "The release gate",
      sentence:
        "4,096 tracers start from the committed seeds around the sphere and take 64 RK4 steps through the field (Δt 2 × 10⁻⁴), each step followed by one Newton step back onto its pair of surfaces, twice. " +
        "The two runs must match byte for byte; and at every 8th step each tracer must still sit on the surfaces it started on — the field's two values, recomputed in double precision at its single-precision position, " +
        `may differ from where they began by at most ${T_CURL_REL} of their range. Which tracer is where is never compared: that would be a test of chaos, not of the code.`,
      label: "run-twice byte-identical, reference agreement passed",
      action: "Run on this GPU",
      links: [
        { label: "gate source", href: blob("tools/productization/web-deploy/verify.py") },
        { label: "capture code", href: blob("packages/curl-noise/web/src/v2/proof/gate.ts") },
        { label: "kernel", href: blob("packages/curl-noise/web/src/field.wgsl") },
      ],
    },
    () => void runGate(),
  );
  gateCard.set({ status: "idle", measured: "run it to measure", budget: `${T_CURL_REL} of the iso range`, adapter: d.adapter });
  pane.append(gateCard.el);

  // 2. live ≡ gated
  const liveCard = proofCard(
    {
      title: "The picture runs the gated arithmetic",
      sentence:
        "The kernel that moves the silk compiles the gated field code itself and writes its RK4 step and reprojection character for character as the gated kernel does. " +
        "Started from the gate's seeds with respawning off, it must give the gate's positions byte for byte at every checkpoint.",
      label: "byte-identical",
      action: "Run on this GPU",
      links: [{ label: "live kernel", href: blob("packages/curl-noise/web/src/v2/model/live.wgsl") }],
    },
    () => void runLive(),
  );
  liveCard.set({ status: "idle", measured: "run it to measure", budget: "0 differing bits", adapter: d.adapter });
  pane.append(liveCard.el);

  // 3–5. the identities, on the field on screen
  const divCard = proofCard(
    {
      title: "Nothing is compressed",
      sentence:
        "At 1,024 points of the flow the divergence is read off the field's exact derivative (the trace of its Jacobian, from the noise's analytic second derivatives — no finite differences). " +
        "In exact arithmetic it is zero; what is left is single-precision rounding.",
      label: "illustrative (not gated)",
      action: "Measure on this GPU",
      links: [{ label: "instruments", href: blob("packages/curl-noise/web/src/instruments.wgsl") }],
    },
    () => void runIdentities(),
  );
  divCard.set({ status: "idle", measured: "run it to measure", budget: "not gated (measured)", adapter: d.adapter });
  const confCard = proofCard(
    {
      title: "Every particle keeps to its surfaces",
      sentence:
        "The velocity is ∇f₁ × ∇f₂, so it is perpendicular to both gradients: v·∇f₁ = 0 and v·∇f₂ = 0, and a particle never leaves the curve where its two surfaces meet. " +
        "The same construction makes (f₁∇f₂)·v vanish too (the Clebsch identity). Measured at the same 1,024 points.",
      label: "illustrative (not gated)",
      action: "Measure on this GPU",
    },
    () => void runIdentities(),
  );
  confCard.set({ status: "idle", measured: "run it to measure", budget: "not gated (measured)", adapter: d.adapter });
  const tanCard = proofCard(
    {
      title: "The flow slides past the sphere",
      sentence:
        "On the sphere f₁ is its distance function, so ∇f₁ is the sphere's normal and the velocity, perpendicular to it, is tangent: v·n = 0. Measured at 256 points on the surface.",
      label: "illustrative (not gated)",
      action: "Measure on this GPU",
    },
    () => void runIdentities(),
  );
  tanCard.set({ status: "idle", measured: "run it to measure", budget: "not gated (measured)", adapter: d.adapter });
  pane.append(divCard.el, confCard.el, tanCard.el);

  pane.append(
    h(
      "p",
      { class: "fs-note" },
      "In CI the same identities are recomputed in double precision on the CPU (machine zero) next to the release gate, and the build re-derives the committed goldens with a JavaScript double-precision mirror of the field (gate IC sha256 ",
      h("span", { class: "bp-mono" }, `${GATE_IC_SHA256.slice(0, 12)}…`),
      "). Coming with later milestones: the 2D Paint check and Break the Certificate, the negative control.",
    ),
  );

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
      const { runs, ic } = await d.gate.capture();
      const c: GateCheck = checkGate(ic, runs[0], runs[1]);
      results["gate"] = { ...c, sha: runs[1].sha };
      gateCard.set({
        status: c.passed ? "pass" : "fail",
        measured: `${c.identical ? "identical" : "DIFFERENT"}; worst drift ${sci(c.isoWorst, 2)} (${pct(c.fraction)} of the budget)`,
        budget: `${sci(c.budgetAbs, 2)} (${T_CURL_REL} × range ${c.isoScale.toFixed(3)})`,
        ratio: c.fraction,
        adapter: d.adapter,
        notes: [
          `${c.tracers.toLocaleString()} tracers × ${c.checkpoints.length} checkpoints; seeds within ${sci(c.icMaxAbsDev, 1)} of the committed f64 values`,
          `positions sha256 ${runs[1].sha.slice(0, 16)}…`,
          "reference: the page's double-precision mirror of the field (CI recomputes it in Python)",
        ],
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
        measured: r.identical ? `${r.compared} of ${r.compared} checkpoints identical` : `first difference at step ${r.firstMismatch}`,
        budget: "0 differing bits",
        ratio: r.identical ? 0 : 1.2,
        adapter: d.adapter,
        notes: [`${r.tracers.toLocaleString()} tracers, 64 steps`],
      });
    });
  }

  async function runIdentities(): Promise<void> {
    const k = d.kernels();
    const f = d.field();
    if (!k || !f) {
      for (const c of [divCard, confCard, tanCard]) c.set({ status: "info", measured: "the live kernels are still compiling" });
      return;
    }
    await guard(async () => {
      for (const c of [divCard, confCard, tanCard]) c.set({ status: "running" });
      const m = await measureInstruments(d.device, k, f.params, f.time);
      results["identities"] = m;
      const divRel = m.divMax / Math.max(m.jacScale, 1e-30);
      divCard.set({
        status: "info",
        measured: `max |∇·v| ${sci(m.divMax, 1)} — ${sci(divRel, 1)} of the largest |∇×v| (${m.jacScale.toFixed(1)})`,
        budget: "not gated (measured)",
        adapter: d.adapter,
        notes: [`${m.probes - 256} points; single precision resolves about 10⁻⁷ of a value`],
      });
      const confRel = Math.max(m.conf1Max, m.conf2Max) / Math.max(m.speedMax, 1e-30);
      confCard.set({
        status: "info",
        measured: `max |v·∇f₁| ${sci(m.conf1Max, 1)}, |v·∇f₂| ${sci(m.conf2Max, 1)}, |(f₁∇f₂)·v| ${sci(m.clebschMax, 1)}`,
        budget: "not gated (measured)",
        adapter: d.adapter,
        notes: [
          `speeds reach ${m.speedMax.toFixed(2)}: the worst residual is ${sci(confRel, 1)} of the fastest speed (per unit gradient)`,
          `the control: kinetic helicity v·(∇×v) is NOT zero for this field — it reaches ${m.helicityMax.toFixed(2)}`,
        ],
      });
      const vnRel = m.vnMax / Math.max(m.surfaceSpeedMax, 1e-30);
      tanCard.set({
        status: "info",
        measured: f.params.obstacle ? `max |v·n| ${sci(m.vnMax, 1)} — ${sci(vnRel, 1)} of the surface speed (${m.surfaceSpeedMax.toFixed(2)})` : "no sphere in the scene",
        budget: "not gated (measured)",
        adapter: d.adapter,
      });
    });
  }

  runAllBtn.addEventListener("click", () => void runAll());
  async function runAll(): Promise<void> {
    await runGate();
    await runLive();
    await runIdentities();
  }

  return {
    results,
    runAll,
    setOnScreen(p) {
      onScreen.textContent = isCanonical(p)
        ? "On screen: the gated field — the sphere where the gate puts it, the field held still."
        : p.evolution > 0
          ? "On screen: an evolving field, outside the gated scene. It is still exactly divergence-free at every instant (the measurements below run on it); the release gate always runs the gated scene."
          : "On screen: your edit of the field, outside the gated scene. It is still exactly divergence-free and tangent to the sphere (the measurements below run on it); the release gate always runs the gated scene.";
    },
  };
}
