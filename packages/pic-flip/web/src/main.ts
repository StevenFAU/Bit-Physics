// PIC / FLIP / APIC water — Stack-B web demo entry point.
//
// One WGSL codebase, two solver paths (web spec § 3 at
// packages/pic-flip/web/verification-demo-spec.md):
//   - the GATED CANONICAL path: fixed-cap Jacobi masked projection (the
//     P24 no-early-stop pattern, cap = the backend's measured-converged
//     value), pure APIC, fixed-point-atomic P2G — replayed from the
//     committed f32 IC against the committed f64 observable references,
//     plus the Props 5.1/5.4/5.5 closed-form golden suite;
//   - the LIVE path: RBGS + SOR (omega 1.9) + warm start, FLIP-ratio
//     slider, moving obstacle, emitters, tilt — labeled live-only, never
//     gated (warm start makes frames history-dependent).
//
// The first browser APIC (web spec § 2 positioning FACT): a REAL masked
// pressure projection — the famous WebGPU water demos are EOS-based
// MLS-MPM with no Poisson solve at all.

import "../../../../common/common-web/src/theme.css";

import { createContext } from "../../../../common/common-ts/src/context.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import {
  exposeCapture,
  field,
  isCapturing,
  runCaptureExclusive,
} from "../../../../common/common-web/src/capture-export.js";
import type {
  CaptureManifestLike,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";

import V from "./generated/verification.json";
import { createPicFlipGpu, MAX_N, FP_SCALE } from "./solver.js";
import type { Mode, SimConfig } from "./solver.js";
import { createRenderer } from "./render.js";
import type { ColorMode } from "./render.js";
import { createSsfr } from "./ssfr.js";
import { PRESETS, seedScene, emitterBatch } from "./presets.js";
import type { ScenePreset } from "./presets.js";
import {
  GATE,
  checkpointErrors,
  computeGateArtifacts,
  fetchIC,
  fetchRefs,
  runCanonicalReplay,
  runStillProbe,
} from "./gate.js";
import {
  makeRotatingDisk2d,
  transferCycleStep2d,
  totalAngularMomentum2d,
  kineticEnergy2d,
} from "./mirror.js";
import type { Disk2D } from "./mirror.js";
import { installVerifyPanel } from "./verify-panel.js";
import { installExplainPanel } from "./explain.js";

// ---- constants hard-checked against the data spine ---------------------------
if (
  V.gate_assets.params_as_run.n_jacobi !== 600 ||
  V.gate_assets.params_as_run.nx !== 12 ||
  V.gate_assets.step_count !== 60 ||
  V.gate_assets.capture_interval !== 10 ||
  V.canonical.n_jacobi !== 3000
) {
  throw new Error(
    "verification.json gate values drifted from compute constants — rerun gen-verification.mjs",
  );
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function setBoot(msg: string): void {
  boot.textContent = msg;
  boot.style.display = msg ? "block" : "none";
}

// GPU exclusivity: capture / gate replays / artifact runs never interleave
// with the live RAF loop (the capture-export harness-race fix).
let exclusiveDepth = 0;
async function withExclusive<T>(fn: () => Promise<T>): Promise<T> {
  exclusiveDepth += 1;
  try {
    return await fn();
  } finally {
    exclusiveDepth -= 1;
  }
}

async function main(): Promise<void> {
  setBoot("initializing WebGPU…");
  const ctx = await createContext();
  const device = ctx.device;
  const gpu = await createPicFlipGpu(device);
  const renderer = await createRenderer(device, canvas, {
    pos: gpu.buf.pos,
    vel: gpu.buf.vel,
    partAux: gpu.buf.paux,
  });
  let ssfr: Awaited<ReturnType<typeof createSsfr>> | null = null;
  try {
    ssfr = await createSsfr(device, canvas, { pos: gpu.buf.pos, vel: gpu.buf.vel });
  } catch {
    ssfr = null; // particles-only fallback
  }
  renderer.cam.target = [0.5, 0.5, 0.35];
  renderer.cam.dist = 2.4;
  renderer.cam.phi = 0.5;

  // ---- URL-shareable state (web spec § 4.1 — no surveyed fluid demo has it) --
  const url = new URLSearchParams(location.search);
  const HARNESS = url.has("harness");
  const live = {
    preset: PRESETS.find((p) => p.id === (url.get("preset") ?? "dam-break")) ?? PRESETS[0],
    mode: ((): Mode => {
      const m = url.get("mode");
      return m === "pic" || m === "flip" || m === "apic" ? m : "apic";
    })(),
    flipRatio: Math.min(1, Math.max(0.8, Number(url.get("flip")) || 0.97)),
    driftOn: url.get("drift") !== "0",
    pushOn: url.get("push") !== "0",
    tiltDeg: Number(url.get("tilt")) || 0,
    seed: Number(url.get("seed")) || 42,
    gridN: 40,
    n: 0,
    frame: 0,
    rhoRest: 0,
    seeded: false,
    obstacle: [0, 0, 0, 0] as [number, number, number, number],
    obstacleVel: [0, 0, 0] as [number, number, number],
    stepsPerFrame: 3,
    solveIters: 40,
  };
  function syncUrl(): void {
    const q = new URLSearchParams();
    q.set("preset", live.preset.id);
    if (live.mode !== "apic") q.set("mode", live.mode);
    if (live.mode === "flip" && live.flipRatio !== 0.97) q.set("flip", String(live.flipRatio));
    if (!live.driftOn) q.set("drift", "0");
    if (!live.pushOn) q.set("push", "0");
    if (live.tiltDeg !== 0) q.set("tilt", String(live.tiltDeg));
    if (live.seed !== 42) q.set("seed", String(live.seed));
    history.replaceState(null, "", `?${q.toString()}`);
  }

  // LIVE loop config (labeled live-only: RBGS+SOR+warm start, dt 1/180).
  const LIVE_DT = 1 / 180;
  function liveConfig(): SimConfig {
    const dx = 1 / live.gridN;
    const tilt = (live.tiltDeg * Math.PI) / 180;
    const g = 9.81;
    return {
      nx: live.gridN,
      ny: live.gridN,
      nz: live.gridN,
      n: live.n,
      nWall: 2,
      dx,
      dt: LIVE_DT,
      rho: 1,
      gravity: [g * Math.sin(tilt), 0, -g * Math.cos(tilt)],
      mode: live.mode,
      nSolve: live.solveIters,
      nExtrap: 3,
      cfl: 0.5,
      driftOn: live.driftOn && live.preset.driftOn,
      driftK: 0.05,
      pushOn: live.pushOn && live.preset.pushOn,
      pushIters: 2,
      pushRadiusFactor: 0.25,
      flipRatio: live.mode === "flip" ? live.flipRatio : 1.0,
      sorOmega: 1.9,
      rhoRest: live.rhoRest,
      vmax: (0.4 * dx) / LIVE_DT,
      liveSolver: true,
      warmStart: true,
      obstacle: live.obstacle,
      obstacleVel: live.obstacleVel,
    };
  }

  // ---- rotating-disk flagship (f64 mirror, 2D transfer cycle) ----------------
  const DISK_DT = 2e-3;
  let disks: Record<Mode, Disk2D> | null = null;
  let diskL: Record<Mode, number[]> = { pic: [], flip: [], apic: [] };
  let diskL0 = 0;
  function resetDisks(): void {
    disks = {
      pic: makeRotatingDisk2d(),
      flip: makeRotatingDisk2d(),
      apic: makeRotatingDisk2d(),
    };
    diskL = { pic: [], flip: [], apic: [] };
    diskL0 = totalAngularMomentum2d(disks.apic);
  }
  function uploadDisk(d: Disk2D): void {
    const p = new Float32Array(d.n * 3);
    const v = new Float32Array(d.n * 3);
    for (let i = 0; i < d.n; i += 1) {
      p[3 * i] = d.pos[2 * i];
      p[3 * i + 1] = 0.5;
      p[3 * i + 2] = d.pos[2 * i + 1];
      v[3 * i] = d.vel[2 * i];
      v[3 * i + 2] = d.vel[2 * i + 1];
    }
    gpu.uploadParticles(p, v, d.n);
  }

  let gateSceneBusy = false;
  let diskMode = false;

  function applyPreset(p: ScenePreset): void {
    live.preset = p;
    live.frame = 0;
    diskMode = p.special === "disk2d";
    live.obstacle = [0, 0, 0, 0];
    live.obstacleVel = [0, 0, 0];
    panel.setActivePreset(p.label);
    syncUrl();
    if (p.special === "gate") {
      void runGateScene();
      return;
    }
    if (diskMode) {
      resetDisks();
      live.n = disks!.apic.n;
      live.seeded = true;
      uploadDisk(disks![live.mode]);
      renderer.cam.target = [0.5, 0.5, 0.5];
      return;
    }
    const seeded = seedScene(p, live.seed, 2, MAX_N);
    live.n = seeded.n;
    live.seeded = false;
    gpu.configure({ ...liveConfig(), rhoRest: 0 });
    gpu.clearReduce();
    gpu.uploadParticles(seeded.positions, new Float32Array(seeded.n * 3), seeded.n);
    // Frame-0 rest density (regularizer #2 threshold) — measured, then pinned.
    void withExclusive(async () => {
      live.rhoRest = await gpu.measureRhoRest();
      gpu.configure(liveConfig());
      gpu.uploadParticles(seeded.positions, new Float32Array(seeded.n * 3), seeded.n);
      live.seeded = true;
    });
  }

  // ---- gate scene (the committed canonical, replayed with a verdict) ---------
  async function runGateScene(): Promise<void> {
    if (gateSceneBusy) return;
    gateSceneBusy = true;
    panel.setStatus("gate scene: replaying the committed web-gate canonical…");
    try {
      await withExclusive(async () => {
        const [ic, refs] = await Promise.all([fetchIC(), fetchRefs()]);
        const res = await runCanonicalReplay(gpu, ic, (step) => {
          renderer.draw({
            n: GATE.n,
            radius: 0.5 / GATE.nx / 2,
            colorMode: 0,
            scalarMin: 0,
            scalarMax: 2,
            colormap: colormap,
          });
          panel.setStatus(`gate scene: step ${step}/${GATE.steps} (Jacobi ${GATE.nJacobi}/step)`);
        });
        const errs = checkpointErrors(res.checkpoints, refs);
        const pass = errs.worstRatio <= 1.0;
        panel.setVerdict({
          gate: `new_canonical — robust observables vs committed refs, rel ${V.gate.declared_rel}`,
          verdict: pass
            ? `PASS — worst ${(errs.worstRatio * 100).toFixed(1)}% of budget`
            : `FAIL — ${errs.worstRatio.toFixed(2)}x budget`,
          pass,
        });
        panel.setDiagnostics([
          { label: "budget used (worst obs)", value: `${(errs.worstRatio * 100).toFixed(1)}%` },
          { label: "rho_rest (measured)", value: res.rhoRest.toFixed(6) },
          {
            label: "vs reference rho_rest",
            value: V.gate_assets.params_as_run.rho_rest_measured_frame0.toFixed(6),
          },
        ]);
        panel.setStatus(
          pass
            ? `gate scene: observables reproduced — worst ${(errs.worstRatio * 100).toFixed(1)}% of the declared budget`
            : "gate scene: FAILED the declared budget",
        );
      });
    } catch (e) {
      panel.setStatus(`gate scene failed: ${(e as Error).message}`);
    } finally {
      gateSceneBusy = false;
    }
  }

  // ---- canonical capture (the CI gate path — pinned params, committed IC) ----
  async function captureCanonical(): Promise<void> {
    return withExclusive(captureCanonicalInner);
  }

  async function captureCanonicalInner(): Promise<void> {
    const t0 = performance.now();
    panel.setStatus("capture: closed-form artifacts (goldens + bit identity)…");
    const art = await computeGateArtifacts(gpu);
    panel.setStatus("capture: still-pool + hydrostatic probes…");
    const still = await runStillProbe(gpu);
    panel.setStatus(`capture: canonical replay (${GATE.steps} steps, Jacobi ${GATE.nJacobi})…`);
    const ic = await fetchIC();
    const res = await runCanonicalReplay(gpu, ic, (s) =>
      panel.setStatus(`capture: canonical step ${s}/${GATE.steps}`),
    );
    const steps: CaptureStepDescriptor[] = res.checkpoints.map((cp) => {
      const state: CaptureStepDescriptor["state"] = {
        position: field(cp.pos, [GATE.n, 3], "f32"),
        velocity: field(cp.vel, [GATE.n, 3], "f32"),
      };
      const diagnostics: Record<string, number> = {
        kinetic_energy: cp.obs.kineticEnergy,
        momentum_x: cp.obs.momentum[0],
        momentum_y: cp.obs.momentum[1],
        momentum_z: cp.obs.momentum[2],
        com_x: cp.obs.com[0],
        com_y: cp.obs.com[1],
        com_z: cp.obs.com[2],
        max_speed: cp.obs.maxSpeed,
        fluid_node_count: cp.obs.fluidNodeCount,
        max_column_height: cp.obs.maxColumnHeight,
        max_div_fluid: cp.maxDiv,
        sort_saturated: cp.sortSaturated ? 1 : 0,
      };
      if (cp.step === 0) {
        state.golden_weights_n_f32 = field(art.weightsNF32, [art.weightsNF32.length], "f32");
        state.golden_weights_n_f64 = field(art.weightsNF64, [art.weightsNF64.length], "f64");
        state.golden_moments_f32 = field(art.momentsF32, [art.momentsF32.length], "f32");
        state.golden_moments_f64 = field(art.momentsF64, [art.momentsF64.length], "f64");
        state.golden_am2_f32 = field(art.am2F32, [art.am2F32.length], "f32");
        state.golden_am2_f64 = field(art.am2F64, [art.am2F64.length], "f64");
        state.golden_am3_f32 = field(art.am3F32, [art.am3F32.length], "f32");
        state.golden_am3_f64 = field(art.am3F64, [art.am3F64.length], "f64");
        state.golden_rt_f32 = field(art.rtF32, [art.rtF32.length], "f32");
        state.golden_rt_f64 = field(art.rtF64, [art.rtF64.length], "f64");
        state.golden_transfer_ladder_f64 = field(
          art.transferLadderF64,
          [art.transferLadderF64.length],
          "f64",
        );
        state.p2g_atomic_fp = field(art.atomicF64, [art.atomicF64.length], "f64");
        state.p2g_oracle_fp = field(art.oracleF64, [art.oracleF64.length], "f64");
        diagnostics.pou_max_dev_f32 = art.pouMaxDevF32;
        diagnostics.bit_identity = art.bitIdentityEqual ? 1 : 0;
        diagnostics.fp_headroom_ratio = art.fpHeadroomRatio;
        diagnostics.still_max_speed = still.maxSpeed;
        diagnostics.still_fluid_nodes_delta = still.fluidNodesDelta;
        diagnostics.hydro_dpdz_rel = still.dpdzTargetRel;
        diagnostics.rho_rest_measured = res.rhoRest;
        diagnostics.weights_f32_rel = art.weightsF32RelMax;
        diagnostics.am_f32_cons_rel = art.amF32ConsRelMax;
        diagnostics.rt_f32_rel = art.rtF32ErrRelMax;
      }
      return { step: cp.step, state, diagnostics };
    });
    const manifest: CaptureManifestLike = {
      schema_version: "1.0.0",
      sim: {
        name: "pic-flip",
        category: "particle-fluids",
        variant: "apic-jiang-2015-collocated-wgsl",
      },
      stack: { name: "webgpu", version: "0.0.1", build_id: "web-deploy-6.x" },
      config: {
        tier: "test",
        dims: [GATE.n, 3],
        dtype: "f32",
        seed: 42,
        params: {
          ...V.gate_assets.params_as_run,
          fp_scale: FP_SCALE,
        },
      },
      run: {
        step_count: GATE.steps,
        capture_interval: GATE.interval,
        wall_clock_seconds: (performance.now() - t0) / 1000,
        start_utc: "2026-07-04T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${V.gate_assets.descriptor}.h5`,
        checksum: `sha256:${V.gate_assets.refs_sha256}`,
      },
      determinism: { claimed: "epsilon", atomic_ops: true, subgroup_ops: false },
    };
    exposeCapture({ manifest, steps }, { download: false });
    panel.setStatus("capture exposed (window.__bitPhysicsCapture)");
  }

  // ---- panel -------------------------------------------------------------------
  let colormap = "aurora";
  let colorMode: ColorMode = 0;
  let renderMode: "water" | "particles" = ssfr ? "water" : "particles";
  let suspended = false;
  const panel = createSettingsPanel("PIC / FLIP / APIC Water", {
    caption:
      "The first browser APIC fluid — a real masked pressure projection (not an EOS), with Jiang 2015's proven angular-momentum conservation running live: switch PIC/FLIP/APIC and watch the proof.",
    initial: { tier: "test", seed: live.seed },
    onCapture: () => runCaptureExclusive(captureCanonical),
    onChange: (s) => {
      live.seed = s.seed;
      if (!diskMode && live.preset.special !== "gate") applyPreset(live.preset);
      syncUrl();
    },
    presets: PRESETS.map((p) => ({
      label: p.label,
      title: p.title,
      apply: () => applyPreset(p),
    })),
    modes: {
      initial: "play",
      onMode: (m) => {
        suspended = m === "study";
      },
    },
    study: {
      diagnostics: [{ label: "solver", value: "warming up…" }],
      honesty: {
        faithful:
          "the APIC/PIC/FLIP transfers, the masked free-surface Poisson with the ADJOINT COMPACT operator pair (backward div + forward grad — a central pair fails hydrostatics outright), solid restore + air extrapolation, RK2 advection, and both regularizers — ported pass-for-pass from the verified reference and gated on your GPU",
        simplified:
          "the LIVE path runs RBGS+SOR with warm start (history-dependent — never gated), a FLIP-ratio blend slider (pedagogy), obstacle/emitter/impulse interactions, and a Jacobi-style push-apart (the reference's serial Gauss-Seidel sweep is not GPU-parallelizable; DECLARED deviation, exactly inert at rest). Angular-momentum conservation is exact at the TRANSFER level (dt=0); end-to-end conservation needs a compatible integrator (Jiang 2017) — the readout is labeled accordingly. APIC dissipates even at dt=0 where FLIP does not (Ding 2020). Extreme regularizer-off pileups can wrap the fixed-point accumulator (deterministic but wrong — the sort-saturation flag reports it).",
        measured:
          V.gate.measured.status === "recorded"
            ? `browser-measured worst observable ${(100 * (V.gate.measured as { worst_ratio_of_budget?: number }).worst_ratio_of_budget!).toFixed(1)}% of the declared rel=${V.gate.declared_rel} budget`
            : "browser measurement pending (recorded into the spec MEASURED block by the step-2 harness)",
      },
      verdict: {
        gate: "new_canonical — robust observables vs committed refs + closed-form golden suite",
        verdict: V.gate.measured.status === "recorded" ? "PASS (see PROVE)" : "pending",
        pass: V.gate.measured.status === "recorded",
      },
      links: [
        { label: "spec", href: V.repo_blob_base + V.links.spec },
        { label: "backend spec", href: V.repo_blob_base + V.links.spec_ref },
        { label: "reference", href: V.repo_blob_base + V.links.reference_apic },
        { label: "gate", href: V.repo_blob_base + V.links.gate_source },
      ],
    },
  });
  document.body.appendChild(panel.element);

  // ---- extra controls ------------------------------------------------------------
  const mkRow = (parent: HTMLElement, label: string): HTMLElement => {
    const row = document.createElement("div");
    row.className = "bps-row";
    const lab = document.createElement("label");
    lab.textContent = label;
    row.appendChild(lab);
    parent.appendChild(row);
    return row;
  };
  const mkSelect = (
    parent: HTMLElement,
    label: string,
    options: [string, string][],
    value: string,
    onChange: (v: string) => void,
  ): HTMLSelectElement => {
    const row = mkRow(parent, label);
    const sel = document.createElement("select");
    sel.className = "bps-select";
    for (const [v, text] of options) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = text;
      sel.appendChild(o);
    }
    sel.value = value;
    sel.addEventListener("change", () => onChange(sel.value));
    row.appendChild(sel);
    return sel;
  };
  const mkSlider = (
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onInput: (v: number) => void,
  ): HTMLInputElement => {
    const row = mkRow(parent, label);
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(value);
    inp.className = "bps-input";
    inp.addEventListener("input", () => onInput(Number(inp.value)));
    row.appendChild(inp);
    return inp;
  };
  const mkCheck = (
    parent: HTMLElement,
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
  ): HTMLInputElement => {
    const row = mkRow(parent, label);
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = value;
    inp.addEventListener("change", () => onChange(inp.checked));
    row.appendChild(inp);
    return inp;
  };

  const simGroup = panel.addGroup("simulation — the signature control");
  mkSelect(
    simGroup,
    "transfer mode",
    [
      ["apic", "APIC (affine — proven conservation)"],
      ["flip", "FLIP (delta — noisy, energetic)"],
      ["pic", "PIC (full — smears, dissipates)"],
    ],
    live.mode,
    (v) => {
      live.mode = v as Mode;
      if (diskMode && disks) uploadDisk(disks[live.mode]);
      else if (live.seeded) gpu.configure(liveConfig());
      syncUrl();
    },
  );
  mkSlider(
    simGroup,
    "FLIP ratio (live-only pedagogy; FLIP mode)",
    0.8,
    1.0,
    0.01,
    live.flipRatio,
    (v) => {
      live.flipRatio = v;
      if (live.seeded && !diskMode) gpu.configure(liveConfig());
      syncUrl();
    },
  );
  mkCheck(simGroup, "drift compensation (OFF ⇒ the water slowly sinks)", live.driftOn, (v) => {
    live.driftOn = v;
    if (live.seeded && !diskMode) gpu.configure(liveConfig());
    syncUrl();
  });
  mkCheck(simGroup, "push-apart (Müller #1 — OFF ⇒ clumping)", live.pushOn, (v) => {
    live.pushOn = v;
    if (live.seeded && !diskMode) gpu.configure(liveConfig());
    syncUrl();
  });
  mkSlider(simGroup, "gravity tilt (deg)", -35, 35, 1, live.tiltDeg, (v) => {
    live.tiltDeg = v;
    if (live.seeded && !diskMode) gpu.configure(liveConfig());
    syncUrl();
  });
  mkSelect(
    simGroup,
    "live pressure iters (RBGS+SOR ω=1.9)",
    [
      ["20", "20 (fast — watch shallow-solve artifacts)"],
      ["40", "40 (default)"],
      ["60", "60 (tight)"],
    ],
    String(live.solveIters),
    (v) => {
      live.solveIters = Number(v);
      if (live.seeded && !diskMode) gpu.configure(liveConfig());
    },
  );
  mkSelect(
    simGroup,
    "grid resolution (the performance lever)",
    [
      ["32", "32³ (floor)"],
      ["40", "40³ (default)"],
      ["48", "48³ (dGPU)"],
    ],
    String(live.gridN),
    (v) => {
      live.gridN = Number(v);
      probed = true;
      if (!diskMode && live.preset.special !== "gate") applyPreset(live.preset);
    },
  );

  const viewGroup = panel.addGroup("view");
  if (ssfr) {
    mkSelect(
      viewGroup,
      "render",
      [
        ["water", "water (SSFR)"],
        ["particles", "particles (debug/honesty)"],
      ],
      renderMode,
      (v) => {
        renderMode = v as "water" | "particles";
      },
    );
  }
  mkSelect(
    viewGroup,
    "color by",
    [
      ["0", "speed"],
      ["1", "pressure"],
      ["2", "divergence (post-projection)"],
      ["3", "|C| — watch the APIC matrix work"],
    ],
    "0",
    (v) => {
      colorMode = Number(v) as ColorMode;
    },
  );
  mkSelect(
    viewGroup,
    "colormap",
    [
      ["aurora", "aurora"],
      ["viridis", "viridis"],
      ["inferno", "inferno"],
      ["turbo", "turbo"],
    ],
    colormap,
    (v) => {
      colormap = v;
    },
  );

  // ---- live plots (angular momentum + volume/drift) ---------------------------
  const plotGroup = panel.addGroup("live readouts (PROVE)");
  const lNote = document.createElement("div");
  lNote.className = "bps-note";
  lNote.textContent =
    "rotating-disk preset: total angular momentum per transfer cycle, f64 mirror of the reference (regularizers OFF — inert there). APIC flat (Props 5.4/5.5), PIC decaying, FLIP carried. Labeled: transfer-level, dt=0 exactness (Jiang 2017 integrator caveat).";
  plotGroup.appendChild(lNote);
  const lPlot = document.createElement("canvas");
  lPlot.width = 300;
  lPlot.height = 90;
  lPlot.style.width = "100%";
  plotGroup.appendChild(lPlot);
  const volNote = document.createElement("div");
  volNote.className = "bps-note";
  volNote.textContent =
    "fluid volume (occupied nodes): with drift compensation ON it holds; OFF it sinks secularly — the failure mode the regularizer exists to fix, plotted, not hidden.";
  plotGroup.appendChild(volNote);
  const volPlot = document.createElement("canvas");
  volPlot.width = 300;
  volPlot.height = 60;
  volPlot.style.width = "100%";
  plotGroup.appendChild(volPlot);
  const volTrace: number[] = [];

  function drawSeries(
    cv: HTMLCanvasElement,
    series: { data: number[]; color: string }[],
    yLabel: string,
  ): void {
    const g = cv.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#0a0f14";
    g.fillRect(0, 0, cv.width, cv.height);
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of series) {
      for (const v of s.data) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
    if (hi - lo < 1e-12) {
      const pad = Math.max(1e-12, Math.abs(hi) * 0.05);
      lo -= pad;
      hi += pad;
    }
    for (const s of series) {
      g.strokeStyle = s.color;
      g.lineWidth = 1.5;
      g.beginPath();
      s.data.forEach((v, i) => {
        const x = (i / Math.max(1, s.data.length - 1)) * (cv.width - 8) + 4;
        const y = cv.height - 6 - ((v - lo) / (hi - lo)) * (cv.height - 14);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
    }
    g.fillStyle = "#8ba0ad";
    g.font = "9px monospace";
    g.fillText(yLabel, 6, 10);
  }

  // ---- PROVE + EXPLAIN -----------------------------------------------------------
  installVerifyPanel({
    panel,
    gpu,
    withExclusive,
    drawSeries,
  });
  installExplainPanel(panel);

  // ---- pointer interaction ---------------------------------------------------------
  let dragging: "impulse" | "orbit" | "obstacle" | null = null;
  let lastX = 0;
  let lastY = 0;
  let lastPlane: [number, number, number] | null = null;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    lastX = e.offsetX;
    lastY = e.offsetY;
    lastPlane = renderer.unprojectToPlane(e.offsetX, e.offsetY);
    if (e.button === 2 || e.ctrlKey) dragging = "orbit";
    else if (e.altKey && live.obstacle[3] > 0) dragging = "obstacle";
    else if (e.shiftKey && live.seeded && !diskMode) {
      // draw-water: paint a small block of particles at the pointer (dli/fluid)
      const c = lastPlane;
      const dx = 1 / live.gridN;
      const spacing = 0.5 * dx;
      const pts: number[] = [];
      const r = 3 * spacing;
      for (let x = -r; x <= r; x += spacing) {
        for (let y = -r; y <= r; y += spacing) {
          for (let z = -r; z <= r; z += spacing) {
            pts.push(
              Math.min(Math.max(c[0] + x, 2 * dx), (live.gridN - 3) * dx),
              Math.min(Math.max(c[1] + y, 2 * dx), (live.gridN - 3) * dx),
              Math.min(Math.max(c[2] + z, 2 * dx), (live.gridN - 3) * dx),
            );
          }
        }
      }
      const added = gpu.appendParticles(live.n, new Float32Array(pts), [0, 0, 0]);
      live.n += added;
      gpu.configure(liveConfig());
      dragging = null;
    } else dragging = "impulse";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.offsetX - lastX;
    const dy = e.offsetY - lastY;
    lastX = e.offsetX;
    lastY = e.offsetY;
    if (dragging === "orbit") {
      renderer.cam.theta -= dx * 0.008;
      renderer.cam.phi = Math.min(1.45, Math.max(-0.4, renderer.cam.phi + dy * 0.006));
      return;
    }
    const plane = renderer.unprojectToPlane(e.offsetX, e.offsetY);
    if (dragging === "obstacle") {
      const nv: [number, number, number] = [
        (plane[0] - live.obstacle[0]) * 30,
        (plane[1] - live.obstacle[1]) * 30,
        (plane[2] - live.obstacle[2]) * 30,
      ];
      live.obstacle = [
        Math.min(1, Math.max(0, plane[0])),
        Math.min(1, Math.max(0, plane[1])),
        Math.min(1, Math.max(0, plane[2])),
        live.obstacle[3],
      ];
      live.obstacleVel = nv;
      if (live.seeded && !diskMode) gpu.configure(liveConfig());
      return;
    }
    if (lastPlane && live.seeded && !diskMode) {
      const vx = (plane[0] - lastPlane[0]) * 25;
      const vy = (plane[1] - lastPlane[1]) * 25;
      const vz = (plane[2] - lastPlane[2]) * 25;
      gpu.splat([plane[0], plane[1], plane[2]], 0.1, [vx, vy, vz]);
    }
    lastPlane = plane;
  });
  const endDrag = (): void => {
    if (dragging === "obstacle") {
      live.obstacleVel = [0, 0, 0];
      if (live.seeded && !diskMode) gpu.configure(liveConfig());
    }
    dragging = null;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      renderer.cam.dist = Math.min(6, Math.max(0.8, renderer.cam.dist * (1 + e.deltaY * 0.001)));
    },
    { passive: false },
  );
  // device-tilt gravity (mobile) — the proven viral interaction; browsers
  // that require a permission gesture simply never fire the event.
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null || diskMode || !live.seeded) return;
    live.tiltDeg = Math.max(-35, Math.min(35, e.gamma));
    gpu.configure(liveConfig());
  });

  // ---- live loop --------------------------------------------------------------------
  let probed = false;
  let frameMsAvg = 0;
  const frameTimes: number[] = [];
  let lastDiag = 0;
  applyPreset(live.preset);

  function tick(): void {
    requestAnimationFrame(tick);
    if (isCapturing() || gateSceneBusy || exclusiveDepth > 0) return;
    const t0 = performance.now();
    if (diskMode && disks && !suspended) {
      for (let c = 0; c < 4; c += 1) {
        transferCycleStep2d(disks.pic, DISK_DT, "pic");
        transferCycleStep2d(disks.flip, DISK_DT, "flip");
        transferCycleStep2d(disks.apic, DISK_DT, "apic");
      }
      diskL.pic.push(totalAngularMomentum2d(disks.pic));
      diskL.flip.push(totalAngularMomentum2d(disks.flip));
      diskL.apic.push(totalAngularMomentum2d(disks.apic));
      for (const k of ["pic", "flip", "apic"] as const) {
        if (diskL[k].length > 600) diskL[k].shift();
      }
      uploadDisk(disks[live.mode]);
      live.frame += 1;
    } else if (!suspended && live.seeded && live.preset.special !== "gate") {
      if (live.preset.emitter && live.n < MAX_N) {
        const dx = 1 / live.gridN;
        const batch = emitterBatch(live.preset.emitter, 0.5 * dx, live.frame);
        if (batch) {
          const added = gpu.appendParticles(live.n, batch, live.preset.emitter.vel);
          if (added > 0) {
            live.n += added;
            gpu.configure(liveConfig());
          }
        }
      }
      if (live.preset.tiltAnim) {
        const a = live.preset.tiltAnim;
        live.tiltDeg = a.amplitudeDeg * Math.sin((live.frame / a.periodFrames) * 2 * Math.PI);
        gpu.configure(liveConfig());
      }
      if (live.preset.obstacleAnim) {
        const o = live.preset.obstacleAnim;
        const drop = Math.min(1, live.frame / 120);
        const z = o.start[2] + (o.dropTo - o.start[2]) * drop;
        const vz = drop < 1 ? ((o.dropTo - o.start[2]) * 60) / 120 : 0;
        if (dragging !== "obstacle") {
          live.obstacle = [o.start[0], o.start[1], z, o.radius];
          live.obstacleVel = [0, 0, vz];
          gpu.configure(liveConfig());
        } else if (live.obstacle[3] === 0) {
          live.obstacle = [o.start[0], o.start[1], z, o.radius];
        }
      }
      gpu.step(live.stepsPerFrame);
      live.frame += 1;
    }
    if (diskMode) {
      renderer.draw({
        n: live.n,
        radius: 0.006,
        colorMode: 0,
        scalarMin: 0,
        scalarMax: 1.2,
        colormap,
      });
      drawSeries(
        lPlot,
        [
          { data: diskL.pic, color: "#e05c5c" },
          { data: diskL.flip, color: "#d8b04d" },
          { data: diskL.apic, color: "#4dd8c0" },
        ],
        `L total (L0=${diskL0.toFixed(4)}) — red PIC / gold FLIP / teal APIC`,
      );
    } else if (live.seeded && live.preset.special !== "gate") {
      const dx = 1 / live.gridN;
      if (renderMode === "water" && ssfr) {
        ssfr.draw({ n: live.n, radius: 0.75 * dx, cam: renderer.cam, foamSpeed: 3.2 });
      } else {
        renderer.draw({
          n: live.n,
          radius: 0.3 * dx,
          colorMode,
          scalarMin: colorMode === 2 ? -2 : 0,
          scalarMax: colorMode === 0 ? (0.4 * dx) / LIVE_DT : colorMode === 1 ? 6 : colorMode === 2 ? 2 : 60,
          colormap,
        });
      }
    }
    const dtMs = performance.now() - t0;
    frameTimes.push(dtMs);
    if (frameTimes.length > 60) frameTimes.shift();
    frameMsAvg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

    // one-shot adaptive probe (spec § 3.1): the GRID is the lever, not N.
    if (!probed && live.frame === 120 && !diskMode) {
      probed = true;
      if (frameMsAvg > 34 && live.gridN > 32) {
        live.gridN = 32;
        panel.setStatus(
          `adaptive grid: measured ${frameMsAvg.toFixed(0)} ms/frame — dropping to 32³ (a declared behavior)`,
        );
        applyPreset(live.preset);
      }
    }

    if (t0 - lastDiag > 700 && live.seeded && !diskMode && live.preset.special !== "gate") {
      lastDiag = t0;
      void (async () => {
        if (exclusiveDepth > 0 || isCapturing()) return;
        const red = await gpu.readReduce();
        const G = live.gridN ** 3;
        const labels = await gpu.readLabels(G);
        let fluidNodes = 0;
        for (let i = 0; i < G; i += 1) if (labels[i] === 1) fluidNodes += 1;
        volTrace.push(fluidNodes);
        if (volTrace.length > 400) volTrace.shift();
        drawSeries(volPlot, [{ data: volTrace, color: "#4dd8c0" }], "fluid nodes");
        const depthCells = Math.round(0.6 * live.gridN);
        panel.setDiagnostics([
          { label: "particles / grid", value: `${live.n} / ${live.gridN}³` },
          { label: "frame", value: `${frameMsAvg.toFixed(1)} ms (${live.stepsPerFrame} steps)` },
          { label: "mode", value: live.mode.toUpperCase() },
          { label: "max |v| (grid CFL)", value: `${red.maxSpeed.toFixed(3)} m/s, ${red.nSub} substep(s)` },
          { label: "max |div u| post-projection", value: red.maxDiv.toExponential(2) },
          {
            label: "solver depth honesty",
            value: `${live.solveIters} RBGS iters vs ~${depthCells}-cell depth (info ~1 cell/sweep — GPU Gems 3 ch. 30)`,
          },
          { label: "fluid nodes", value: String(fluidNodes) },
          { label: "sort cap", value: red.sortSaturated ? "SATURATED (declared)" : "ok" },
        ]);
      })();
    }
  }
  requestAnimationFrame(tick);

  setBoot("");
  (globalThis as Record<string, unknown>).__picFlipDebug = {
    gpu,
    live,
    applyPreset,
    presets: PRESETS,
    withExclusive,
  };
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;

  // ---- headless harness (step-2 measurement + dev verification) ---------------------
  if (HARNESS) {
    void withExclusive(async () => {
      const out: Record<string, unknown> = {};
      try {
        const art = await computeGateArtifacts(gpu);
        out.weights_f32_rel = art.weightsF32RelMax;
        out.pou_max_dev_f32 = art.pouMaxDevF32;
        out.am_f32_cons_rel = art.amF32ConsRelMax;
        out.rt_f32_rel = art.rtF32ErrRelMax;
        out.bit_identity = art.bitIdentityEqual;
        out.fp_headroom = art.fpHeadroomRatio;
        out.am2_f64 = Array.from(art.am2F64);
        out.am3_f64 = Array.from(art.am3F64);
        out.rt_f64 = Array.from(art.rtF64);
        out.ladder_f64 = Array.from(art.transferLadderF64);
        const still = await runStillProbe(gpu);
        out.still_max_speed = still.maxSpeed;
        out.still_fluid_nodes_delta = still.fluidNodesDelta;
        out.hydro_dpdz = still.dpdz;
        out.hydro_dpdz_rel = still.dpdzTargetRel;
        const ic = await fetchIC();
        const refs = await fetchRefs();
        const t0 = performance.now();
        const r1 = await runCanonicalReplay(gpu, ic);
        out.replay_ms = performance.now() - t0;
        const r2 = await runCanonicalReplay(gpu, ic);
        const errs = checkpointErrors(r1.checkpoints, refs);
        out.worst_ratio_of_budget = errs.worstRatio;
        out.worst_observable = errs.worstObs;
        out.per_checkpoint = errs.rows;
        out.rho_rest = r1.rhoRest;
        out.rho_rest_ref = V.gate_assets.params_as_run.rho_rest_measured_frame0;
        let twice = true;
        for (let ci = 0; ci < r1.checkpoints.length; ci += 1) {
          const a = r1.checkpoints[ci];
          const b = r2.checkpoints[ci];
          const eq = (x: Float32Array, y: Float32Array): boolean =>
            x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
          if (!eq(a.pos, b.pos) || !eq(a.vel, b.vel)) twice = false;
        }
        out.run_twice_identical = twice;
        // live perf ladder (grid is the lever)
        const perf: Record<string, number> = {};
        for (const gn of [32, 40, 48]) {
          live.gridN = gn;
          probed = true;
          applyPreset(PRESETS[0]);
          // wait for async seed (rho_rest measure)
          while (!live.seeded) await new Promise((r) => setTimeout(r, 10));
          const p0 = performance.now();
          gpu.step(60);
          await device.queue.onSubmittedWorkDone();
          perf[`step_ms_at_${gn}`] = (performance.now() - p0) / 60;
        }
        out.perf = perf;
        // rotating disk mirror sanity (200 cycles): APIC flat, PIC decays
        const dA = makeRotatingDisk2d();
        const dP = makeRotatingDisk2d();
        const l0 = totalAngularMomentum2d(dA);
        const ke0 = kineticEnergy2d(dA);
        for (let s = 0; s < 200; s += 1) {
          transferCycleStep2d(dA, DISK_DT, "apic");
          transferCycleStep2d(dP, DISK_DT, "pic");
        }
        out.disk_l0 = l0;
        out.disk_ke0 = ke0;
        out.disk_apic_l_drift_rel = Math.abs(totalAngularMomentum2d(dA) - l0) / Math.abs(l0);
        out.disk_pic_l_drift_rel = Math.abs(totalAngularMomentum2d(dP) - l0) / Math.abs(l0);
        out.ok = true;
      } catch (e) {
        out.ok = false;
        out.error = String(e instanceof Error ? (e.stack ?? e.message) : e);
      }
      (globalThis as { __harnessResult?: unknown }).__harnessResult = out;
      console.log("HARNESS_RESULT " + JSON.stringify(out));
    });
  }
}

main().catch((e) => {
  setBoot(`WebGPU unavailable: ${(e as Error).message}`);
  console.error(e);
});
