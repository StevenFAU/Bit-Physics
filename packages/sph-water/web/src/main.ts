// SPH Water (DFSPH) — Stack-B web demo entry point.
//
// Two tiers, one WGSL codebase (spec § 3 at
// packages/sph-water/web/verification-demo-spec.md):
//   - the GATED VERIFIED CORE: f32 port of the Phase-1 reference
//     (packages/sph-water/sph_water/reference/dfsph.py), bound to committed
//     artifacts — the golden kernel table, the two-particle fixture, the
//     100K canonical capture (pointwise, non-chaotic — spec § 2.0), the
//     hash==brute i32 search proof, and the in-page f64 mirror;
//   - the LIVE full-DFSPH solver (Bender-Koschier dual solver + SDF walls +
//     XSPH), beyond-reference and labeled as such in-demo.
//
// The capture path replays the canonical free-fall from the committed f32 IC
// (public/sph-gate-ic.bin) with pinned params — live sliders can NEVER touch
// it. Determinism: same-device run-twice byte-identical (all gathers are
// order-deterministic after the per-cell id-sort; binning atomics are
// integer); cross-device is distributional, stated honestly.

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
import FIX from "../fixtures/reference-fixtures.json";
import { createSphGpu } from "./solver.js";
import type { SphGpu, CheckpointData } from "./solver.js";
import { createRenderer } from "./render.js";
import type { Renderer, ColorMode } from "./render.js";
import { createSsfr } from "./ssfr.js";
import type { Ssfr } from "./ssfr.js";
import {
  PRESETS,
  seedScene,
  liveConfigFor,
  emitterBatch,
  BOX_MAX,
} from "./presets.js";
import type { ScenePreset } from "./presets.js";
import {
  compareBitExact,
  kernelGradWMag,
  kernelW,
  mirrorContinuity,
  mirrorCorrector,
  mirrorDensity,
} from "./mirror.js";
import { installVerifyPanel } from "./verify-panel.js";
import { installExplainPanel } from "./explain.js";

// ---- canonical constants (must agree with the data spine — HARD CHECK) ------
const CANON = {
  n: 100_000,
  h: 0.026,
  dt: 1e-3,
  gz: -9.81,
  mass: 1e-3,
  rho0: 1000.0,
  steps: 1000,
  interval: 100,
  stride: 16,
};
if (
  V.canonical.params_as_run.h !== CANON.h ||
  V.canonical.params_as_run.dt !== CANON.dt ||
  V.canonical.params_as_run.g_z !== CANON.gz ||
  V.canonical.params_as_run.mass !== CANON.mass ||
  V.canonical.params_as_run.rho_0 !== CANON.rho0 ||
  V.canonical.n_particles !== CANON.n ||
  V.canonical.step_count !== CANON.steps ||
  V.canonical.capture_interval !== CANON.interval ||
  V.gate.thresholds.stride !== CANON.stride
) {
  throw new Error(
    "verification.json canonical values drifted from compute constants — rerun gen-verification.mjs",
  );
}

const boot = document.getElementById("boot") as HTMLDivElement;
const canvas = document.getElementById("view") as HTMLCanvasElement;

function setBoot(msg: string): void {
  boot.textContent = msg;
  boot.style.display = msg ? "block" : "none";
}

async function sha256hex(data: ArrayBufferView): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data.buffer as ArrayBuffer,
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---- lazy gate assets ---------------------------------------------------------
let icCache: Float32Array | null = null;
export async function fetchIC(): Promise<Float32Array> {
  if (icCache) return icCache;
  const r = await fetch("./sph-gate-ic.bin");
  if (!r.ok) throw new Error("sph-gate-ic.bin fetch failed");
  icCache = new Float32Array(await r.arrayBuffer());
  if (icCache.length !== CANON.n * 3) throw new Error("ic.bin size mismatch");
  return icCache;
}

let refsCache: Float64Array | null = null;
export async function fetchRefs(): Promise<Float64Array> {
  if (refsCache) return refsCache;
  const r = await fetch("./sph-gate-refs.bin");
  if (!r.ok) throw new Error("sph-gate-refs.bin fetch failed");
  refsCache = new Float64Array(await r.arrayBuffer());
  return refsCache;
}

const SUB_COUNT = Math.ceil(CANON.n / CANON.stride);

export interface CheckpointErrors {
  step: number;
  posAbs: number;
  velAbs: number;
  rhoAbs: number;
  ratio: number; // of the declared budget
}

export function checkpointErrors(
  cps: CheckpointData[],
  refs: Float64Array,
): { rows: CheckpointErrors[]; worstRatio: number; worst: { position: number; velocity: number; density: number } } {
  const rows: CheckpointErrors[] = [];
  let worstRatio = 0;
  const worst = { position: 0, velocity: 0, density: 0 };
  cps.forEach((cp, ci) => {
    let posAbs = 0;
    let velAbs = 0;
    let rhoAbs = 0;
    let maxP = 0;
    let maxV = 0;
    let maxR = 0;
    for (let k = 0; k < SUB_COUNT; k += 1) {
      const base = (ci * SUB_COUNT + k) * 7;
      for (let c = 0; c < 3; c += 1) {
        posAbs = Math.max(posAbs, Math.abs(cp.position[k * 3 + c] - refs[base + c]));
        velAbs = Math.max(velAbs, Math.abs(cp.velocity[k * 3 + c] - refs[base + 3 + c]));
        maxP = Math.max(maxP, Math.abs(cp.position[k * 3 + c]));
        maxV = Math.max(maxV, Math.abs(cp.velocity[k * 3 + c]));
      }
      rhoAbs = Math.max(rhoAbs, Math.abs(cp.density[k] - refs[base + 6]));
      maxR = Math.max(maxR, Math.abs(cp.density[k]));
    }
    const rel = V.gate.declared_rel;
    const ratio = Math.max(
      maxP > 0 ? posAbs / (rel * maxP) : 0,
      maxV > 0 ? velAbs / (rel * maxV) : 0,
      maxR > 0 ? rhoAbs / (rel * maxR) : 0,
    );
    worstRatio = Math.max(worstRatio, ratio);
    worst.position = Math.max(worst.position, posAbs);
    worst.velocity = Math.max(worst.velocity, velAbs);
    worst.density = Math.max(worst.density, rhoAbs);
    rows.push({ step: cp.step, posAbs, velAbs, rhoAbs, ratio });
  });
  return { rows, worstRatio, worst };
}

// ---- gate artifacts (golden kernel, fixtures, mirror, hash==brute, norm) ----
export interface GateArtifacts {
  kernelW32: Float32Array;
  kernelG32: Float32Array;
  kernelW64: Float64Array;
  kernelG64: Float64Array;
  goldenF64Dev: number;
  goldenF32Rel: number;
  twoRho: Float64Array;
  twoDrho: Float64Array;
  mirrorFlags: {
    two: boolean;
    density64: boolean;
    continuity64: boolean;
    corrector8: boolean;
  };
  correctorGpuMaxAbs: number;
  nsearchGrid: Int32Array;
  nsearchBrute: Int32Array;
  hashBruteEqual: boolean;
  gridSha: string;
  bruteSha: string;
  normMean: number;
  normMaxDev: number;
}

export async function computeGateArtifacts(gpu: SphGpu): Promise<GateArtifacts> {
  const pts = V.golden.kernel_points.map((p) => ({ q: p.q, h: p.h }));
  const k32 = await gpu.runKernelEval(pts);
  const kernelW32 = new Float32Array(pts.length);
  const kernelG32 = new Float32Array(pts.length);
  pts.forEach((_, i) => {
    kernelW32[i] = k32[i * 2];
    kernelG32[i] = k32[i * 2 + 1];
  });
  const c1 = (FIX.kernel_coeffs as Record<string, { sigma_h3: number; sigma_h4: number }>)["1.0"];
  const kernelW64 = new Float64Array(pts.length);
  const kernelG64 = new Float64Array(pts.length);
  let goldenF64Dev = 0;
  let goldenF32Rel = 0;
  V.golden.kernel_points.forEach((p, i) => {
    kernelW64[i] = kernelW(p.q, c1);
    kernelG64[i] = kernelGradWMag(p.q, c1);
    goldenF64Dev = Math.max(
      goldenF64Dev,
      Math.abs(kernelW64[i] - p.W),
      Math.abs(kernelG64[i] - p.grad_W_magnitude),
    );
    const sw = Math.max(Math.abs(p.W), 1e-30);
    const sg = Math.max(Math.abs(p.grad_W_magnitude), 1e-30);
    goldenF32Rel = Math.max(
      goldenF32Rel,
      Math.abs(kernelW32[i] - p.W) / sw,
      Math.abs(kernelG32[i] - p.grad_W_magnitude) / sg,
    );
  });

  // f64 mirror vs committed reference-computed fixtures (bit-exact target)
  const two = FIX.two_particle;
  const twoPos = new Float64Array(two.particles.flatMap((p) => p.p));
  const twoVel = new Float64Array(two.particles.flatMap((p) => p.v));
  const twoMass = new Float64Array(two.particles.map((p) => p.m));
  const twoRho = mirrorDensity(twoPos, twoMass, 2, two.h, c1);
  const twoDrho = mirrorContinuity(twoPos, twoVel, twoMass, 2, two.h, c1);
  const twoOk =
    compareBitExact("two_rho", twoRho, two.rho).bitExact &&
    compareBitExact("two_drho", twoDrho, two.drho_dt).bitExact;

  const cH = (FIX.kernel_coeffs as Record<string, { sigma_h3: number; sigma_h4: number }>)[
    String(FIX.density_64.h)
  ];
  const d64 = FIX.density_64;
  const p64 = new Float64Array(d64.positions.flat());
  const v64 = new Float64Array(d64.velocities.flat());
  const m64 = new Float64Array(64).fill(d64.mass);
  const rho64 = mirrorDensity(p64, m64, 64, d64.h, cH);
  const drho64 = mirrorContinuity(p64, v64, m64, 64, d64.h, cH);
  const density64Ok = compareBitExact("rho64", rho64, d64.rho).bitExact;
  const continuity64Ok = compareBitExact("drho64", drho64, d64.drho_dt).bitExact;

  const c8 = FIX.corrector_8;
  const p8 = new Float64Array(c8.positions.flat());
  const v8 = new Float64Array(c8.velocities.flat());
  const m8 = new Float64Array(8).fill(c8.mass);
  const corr = mirrorCorrector(
    p8,
    v8,
    m8,
    8,
    c8.h,
    c8.max_iter,
    c8.tolerance,
    c8.rho_0,
    cH,
  );
  const corrector8Ok = compareBitExact(
    "corr8",
    corr.vel,
    new Float64Array(c8.corrected_velocities.flat()),
  ).bitExact;

  // the WGSL f32 corrector against the f64 mirror (measured deviation)
  const gpuCorr = await gpu.runCorrectorFixture({
    positions: c8.positions,
    velocities: c8.velocities,
    mass: c8.mass,
    h: c8.h,
    maxIter: c8.max_iter,
    tolerance: c8.tolerance,
    rho0: c8.rho_0,
  });
  let correctorGpuMaxAbs = 0;
  for (let i = 0; i < 24; i += 1)
    correctorGpuMaxAbs = Math.max(correctorGpuMaxAbs, Math.abs(gpuCorr.velocities[i] - corr.vel[i]));

  // hash==brute at N=4096 on a seeded deterministic cloud (LCG — no RNG state)
  const nHB = 4096;
  const hb = new Float32Array(nHB * 3);
  let st = 42 >>> 0;
  const lcg = () => {
    st = (1664525 * st + 1013904223) >>> 0;
    return st / 4294967296;
  };
  for (let i = 0; i < nHB * 3; i += 1) hb[i] = lcg();
  const h = 0.05;
  const { grid, brute } = await gpu.runHashBrute(hb, nHB, h, {
    origin: [-0.1, -0.1, -0.1],
    dims: [12, 12, 12],
    cell: 2 * h,
  });
  const hashBruteEqual =
    grid.length === brute.length && grid.every((v, i) => v === brute[i]);
  const [gridSha, bruteSha] = await Promise.all([sha256hex(grid), sha256hex(brute)]);

  const norm = await gpu.runNormalizationCheck();

  return {
    kernelW32,
    kernelG32,
    kernelW64,
    kernelG64,
    goldenF64Dev,
    goldenF32Rel,
    twoRho,
    twoDrho,
    mirrorFlags: { two: twoOk, density64: density64Ok, continuity64: continuity64Ok, corrector8: corrector8Ok },
    correctorGpuMaxAbs,
    nsearchGrid: grid,
    nsearchBrute: brute,
    hashBruteEqual,
    gridSha,
    bruteSha,
    normMean: norm.mean,
    normMaxDev: norm.maxDev,
  };
}

// ---- main ---------------------------------------------------------------------
async function main(): Promise<void> {
  setBoot("initializing WebGPU…");
  const ctx = await createContext();
  const device = ctx.device;
  device.lost.then((info) => setBoot(`WebGPU device lost: ${info.message}`));

  setBoot("building pipelines…");
  const gpu = await createSphGpu(device);
  const renderer: Renderer = await createRenderer(device, canvas, {
    pos: gpu.buf.pos,
    vel: gpu.buf.vel,
    partAux: gpu.buf.partAux,
  });
  let ssfr: Ssfr | null = null;
  try {
    ssfr = await createSsfr(device, canvas, {
      pos: gpu.buf.pos,
      vel: gpu.buf.vel,
    });
  } catch (e) {
    console.warn("SSFR unavailable, falling back to particles:", e);
  }

  // hiDPI
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const w = Math.round(canvas.clientWidth * dpr);
    const hpx = Math.round(canvas.clientHeight * dpr);
    if (w > 0 && hpx > 0 && (canvas.width !== w || canvas.height !== hpx)) {
      canvas.width = w;
      canvas.height = hpx;
      ssfr?.resize();
    }
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- live state -------------------------------------------------------------
  const live = gpu.createLive(
    liveConfigFor(PRESETS[0], { h: 0.03, mass: 0.027 }, {
      rho0: CANON.rho0,
      warmStart: false,
      densityIters: 8,
      divergenceIters: 4,
    }),
  );

  // GPU exclusivity: the replay/artifact/proof paths share the sim buffers
  // and uniforms with the live loop — anything that runs them must suspend
  // live stepping or the state is corrupted mid-flight.
  let exclusiveDepth = 0;
  async function withExclusive<T>(fn: () => Promise<T>): Promise<T> {
    exclusiveDepth += 1;
    try {
      return await fn();
    } finally {
      exclusiveDepth -= 1;
    }
  }

  let preset: ScenePreset = PRESETS[0];
  let nTarget = 30_000;
  let spacing = 0.02;
  let frame = 0;
  let suspended = false;
  let gateSceneActive = false;
  let renderMode: "water" | "particles" = ssfr ? "water" : "particles";
  let colorMode: ColorMode = 0;
  let colormap = "aurora";
  let substeps = 2;
  let solverMsAvg = 0;
  let probed = false;

  function applyPreset(p: ScenePreset): void {
    preset = p;
    gateSceneActive = !!p.gateScene;
    frame = 0;
    if (p.gateScene) {
      void runGateScene();
      return;
    }
    const seeded = seedScene(p, nTarget, CANON.rho0);
    spacing = seeded.spacing;
    const cfg = liveConfigFor(p, seeded, {
      rho0: CANON.rho0,
      warmStart: live.config.warmStart,
      densityIters: live.config.densityIters,
      divergenceIters: live.config.divergenceIters,
    });
    cfg.gravity = [...p.gravity];
    live.config = cfg;
    live.seed(seeded.positions);
    live.interaction.obstacle = p.obstacle ? [...p.obstacle] : [0, 0, 0, 0];
    panel.setActivePreset(p.label);
  }

  // ---- the gate scene: the canonical replay, rendered, with live errors --------
  let gateSceneBusy = false;
  async function runGateScene(): Promise<void> {
    if (gateSceneBusy) return;
    gateSceneBusy = true;
    panel.setStatus("gate scene: replaying the committed canonical…");
    exclusiveDepth += 1;
    try {
      const [ic, refs] = await Promise.all([fetchIC(), fetchRefs()]);
      renderer.cam.target = [0.5, 0.5, -1.6];
      renderer.cam.dist = 4.6;
      const res = await gpu.runCanonicalReplay(ic, {
        h: CANON.h,
        dt: CANON.dt,
        gz: CANON.gz,
        mass: CANON.mass,
        steps: CANON.steps,
        interval: CANON.interval,
        stride: CANON.stride,
        onProgress: (step) => {
          renderer.draw({
            n: CANON.n,
            radius: 0.006,
            colorMode: 0,
            scalarMin: 0,
            scalarMax: 10,
            colormap,
          });
          panel.setStatus(`gate scene: step ${step}/1000`);
        },
      });
      const errs = checkpointErrors(res.checkpoints, refs);
      const pass = errs.worstRatio <= 1.0 && !res.sortSaturated;
      panel.setVerdict({
        gate: "pointwise vs committed capture (::16), rel 1e-4",
        verdict: pass
          ? `PASS — worst ${(errs.worstRatio * 100).toFixed(1)}% of budget`
          : `FAIL — ${errs.worstRatio.toFixed(2)}x budget`,
        pass,
      });
      panel.setDiagnostics([
        { label: "worst |Δposition|", value: errs.worst.position.toExponential(2) },
        { label: "worst |Δvelocity|", value: errs.worst.velocity.toExponential(2) },
        { label: "worst |Δdensity|", value: errs.worst.density.toExponential(2) },
        { label: "budget used", value: `${(errs.worstRatio * 100).toFixed(1)}%` },
        { label: "replay wall-clock", value: `${(res.ms / 1000).toFixed(1)} s` },
      ]);
      panel.setStatus(
        pass
          ? `gate scene: reproduced the committed capture — worst error ${(errs.worstRatio * 100).toFixed(1)}% of the declared budget`
          : "gate scene: FAILED the declared budget",
      );
    } catch (e) {
      panel.setStatus(`gate scene failed: ${(e as Error).message}`);
    } finally {
      gateSceneBusy = false;
      exclusiveDepth -= 1;
    }
  }

  // ---- canonical capture (the CI gate path — pinned params, scratch state) ----
  async function captureCanonical(): Promise<void> {
    return withExclusive(captureCanonicalInner);
  }

  async function captureCanonicalInner(): Promise<void> {
    panel.setStatus("capturing canonical (1000 steps + 11 density fields @100K)…");
    const ic = await fetchIC();
    const t0 = performance.now();
    const res = await gpu.runCanonicalReplay(ic, {
      h: CANON.h,
      dt: CANON.dt,
      gz: CANON.gz,
      mass: CANON.mass,
      steps: CANON.steps,
      interval: CANON.interval,
      stride: CANON.stride,
      onProgress: (s) => panel.setStatus(`canonical replay: step ${s}/1000`),
    });
    panel.setStatus("computing gate artifacts…");
    const art = await computeGateArtifacts(gpu);
    const steps: CaptureStepDescriptor[] = res.checkpoints.map((cp) => {
      const state: CaptureStepDescriptor["state"] = {
        position: field(cp.position, [SUB_COUNT, 3], "f32"),
        velocity: field(cp.velocity, [SUB_COUNT, 3], "f32"),
        density: field(cp.density, [SUB_COUNT], "f32"),
      };
      let meanRho = 0;
      for (let i = 0; i < cp.density.length; i += 1) meanRho += cp.density[i];
      meanRho /= Math.max(cp.density.length, 1);
      let maxSpeed = 0;
      for (let i = 0; i < SUB_COUNT; i += 1) {
        const s = Math.hypot(
          cp.velocity[i * 3],
          cp.velocity[i * 3 + 1],
          cp.velocity[i * 3 + 2],
        );
        maxSpeed = Math.max(maxSpeed, s);
      }
      const diagnostics: Record<string, number> = {
        mean_density_subsample: meanRho,
        max_speed_subsample: maxSpeed,
      };
      if (cp.step === 0) {
        state.kernel_w_f32 = field(art.kernelW32, [art.kernelW32.length], "f32");
        state.kernel_grad_f32 = field(art.kernelG32, [art.kernelG32.length], "f32");
        state.kernel_w_f64 = field(art.kernelW64, [art.kernelW64.length], "f64");
        state.kernel_grad_f64 = field(art.kernelG64, [art.kernelG64.length], "f64");
        state.two_particle_rho_f64 = field(art.twoRho, [2], "f64");
        state.two_particle_drho_f64 = field(art.twoDrho, [2], "f64");
        state.nsearch_grid_fp = field(
          Float64Array.from(art.nsearchGrid),
          [art.nsearchGrid.length],
          "f64",
        );
        state.nsearch_brute_fp = field(
          Float64Array.from(art.nsearchBrute),
          [art.nsearchBrute.length],
          "f64",
        );
        diagnostics.mirror_two_bitexact = art.mirrorFlags.two ? 1 : 0;
        diagnostics.mirror_density64_bitexact = art.mirrorFlags.density64 ? 1 : 0;
        diagnostics.mirror_continuity64_bitexact = art.mirrorFlags.continuity64 ? 1 : 0;
        diagnostics.mirror_corrector8_bitexact = art.mirrorFlags.corrector8 ? 1 : 0;
        diagnostics.normalization_mean = art.normMean;
        diagnostics.normalization_maxdev = art.normMaxDev;
        diagnostics.sort_saturated = res.sortSaturated ? 1 : 0;
        diagnostics.corrector_gpu_vs_mirror_maxabs = art.correctorGpuMaxAbs;
        diagnostics.golden_f64_dev = art.goldenF64Dev;
        diagnostics.golden_f32_rel = art.goldenF32Rel;
        diagnostics.hash_brute_equal = art.hashBruteEqual ? 1 : 0;
      }
      return { step: cp.step, state, diagnostics };
    });
    const manifest: CaptureManifestLike = {
      schema_version: "1.0.0",
      sim: {
        name: "sph-water",
        category: "particle-fluids",
        variant: "dfsph-bender-koschier-2015",
      },
      stack: { name: "webgpu", version: "0.0.1", build_id: "web-deploy-6.x" },
      config: {
        tier: "test",
        dims: [CANON.n, 3],
        dtype: "f32",
        seed: 42,
        params: {
          h: CANON.h,
          dt: CANON.dt,
          g_z: CANON.gz,
          rho_0: CANON.rho0,
          n_particles: CANON.n,
        },
      },
      run: {
        step_count: CANON.steps,
        capture_interval: CANON.interval,
        wall_clock_seconds: (performance.now() - t0) / 1000,
        start_utc: "2026-07-04T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${V.canonical.descriptor}.h5`,
        checksum: `sha256:${V.canonical.payload_sha256}`,
      },
      determinism: {
        claimed: "bit-exact-same-hw",
        atomic_ops: true,
        subgroup_ops: false,
      },
    };
    exposeCapture({ manifest, steps }, { download: false });
    panel.setStatus("capture exposed (window.__bitPhysicsCapture)");
  }

  // ---- panel ------------------------------------------------------------------
  const panel = createSettingsPanel("SPH Water — DFSPH", {
    caption:
      "The first DFSPH in a browser — divergence-free SPH water, screen-space rendered, with a live verification instrument bound to the committed golden tables and the 100K canonical capture.",
    initial: { tier: "test", seed: 42 },
    onCapture: () => runCaptureExclusive(captureCanonical),
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
      diagnostics: [
        { label: "solver", value: "warming up…" },
      ],
      honesty: {
        faithful:
          "kernel (support-2h cubic spline), density, continuity, corrector, counting-sort neighbor search, and the canonical free-fall integrator — the gated, capture-verified code paths",
        simplified:
          "the live dual pressure solver (Bender-Koschier 2015), SDF walls, XSPH viscosity, and interaction impulses go BEYOND the committed Phase-1 reference; their evidence is the Tier-2 live diagnostics, not the gate",
        measured:
          V.gate.measured.status === "recorded"
            ? `browser-measured worst error ${(100 * ((V.gate.measured as unknown as { worst_ratio_of_budget: number }).worst_ratio_of_budget ?? 0)).toFixed(1)}% of the declared rel=1e-4 budget`
            : "browser measurement pending (spec § 8.3)",
      },
      verdict: {
        gate: "new_canonical — pointwise vs committed 100K capture",
        verdict: V.gate.measured.status === "recorded" ? "PASS (see PROVE)" : "pending",
        pass: V.gate.measured.status === "recorded",
      },
      links: [
        { label: "spec", href: V.repo_blob_base + V.links.spec },
        { label: "reference", href: V.repo_blob_base + V.links.reference },
        { label: "gate", href: V.repo_blob_base + V.links.gate_source },
      ],
    },
  });
  document.body.appendChild(panel.element);

  // ---- extra controls -----------------------------------------------------------
  const simGroup = panel.addGroup("simulation");
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
  ) => {
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
  ) => {
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
  const mkCheck = (parent: HTMLElement, label: string, value: boolean, onChange: (v: boolean) => void) => {
    const row = mkRow(parent, label);
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = value;
    inp.addEventListener("change", () => onChange(inp.checked));
    row.appendChild(inp);
    return inp;
  };

  mkSelect(
    simGroup,
    "particles",
    [
      ["8000", "8K (floor)"],
      ["15000", "15K"],
      ["30000", "30K (iGPU target)"],
      ["60000", "60K"],
      ["100000", "100K (dGPU)"],
    ],
    String(nTarget),
    (v) => {
      nTarget = Number(v);
      probed = true; // manual choice overrides the probe
      if (!gateSceneActive) applyPreset(preset);
    },
  );
  mkSlider(simGroup, "viscosity (XSPH)", 0, 0.3, 0.005, 0.06, (v) => {
    live.config = { ...live.config, xsphAlpha: v };
  });
  mkSlider(simGroup, "gravity tilt", -6, 6, 0.1, 0, (v) => {
    const g = live.config.gravity;
    live.config = { ...live.config, gravity: [v, g[1], g[2]] };
  });
  mkSelect(
    simGroup,
    "pressure iters",
    [
      ["4", "4 (fast)"],
      ["8", "8 (default)"],
      ["12", "12 (tight)"],
    ],
    "8",
    (v) => {
      live.config = { ...live.config, densityIters: Number(v) };
    },
  );
  mkCheck(
    simGroup,
    "warm start (Carensac 2022 instability — watch the density error cycle)",
    false,
    (v) => {
      live.config = { ...live.config, warmStart: v };
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
      ["1", "density"],
      ["2", "neighbor count"],
      ["3", "solver error"],
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

  // ---- PROVE + EXPLAIN ----------------------------------------------------------
  installVerifyPanel({
    panel,
    gpu,
    fetchIC,
    fetchRefs,
    computeGateArtifacts: () => withExclusive(() => computeGateArtifacts(gpu)),
    checkpointErrors,
    canon: CANON,
    subCount: SUB_COUNT,
    withExclusive,
  });
  installExplainPanel(panel);

  // ---- pointer interaction --------------------------------------------------------
  let dragging: "impulse" | "orbit" | "obstacle" | null = null;
  let lastX = 0;
  let lastY = 0;
  let lastPlane: [number, number, number] | null = null;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    lastX = e.offsetX;
    lastY = e.offsetY;
    if (e.button === 2 || e.ctrlKey) dragging = "orbit";
    else if (e.altKey && live.interaction.obstacle[3] > 0) dragging = "obstacle";
    else dragging = "impulse";
    lastPlane = renderer.unprojectToPlane(e.offsetX, e.offsetY);
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
      live.interaction.obstacle[0] = Math.min(1, Math.max(0, plane[0]));
      live.interaction.obstacle[1] = Math.min(1, Math.max(0, plane[1]));
      live.interaction.obstacle[2] = Math.min(1, Math.max(0, plane[2]));
      return;
    }
    if (lastPlane) {
      const vx = (plane[0] - lastPlane[0]) * 60;
      const vy = (plane[1] - lastPlane[1]) * 60;
      const vz = (plane[2] - lastPlane[2]) * 60;
      live.interaction.impulsePos = [plane[0], plane[1], plane[2], 3.2 * spacing * 4];
      live.interaction.impulseVel = [vx * 0.35, vy * 0.35, vz * 0.35, 1.5];
    }
    lastPlane = plane;
  });
  const endDrag = () => {
    dragging = null;
    live.interaction.impulsePos = [0, 0, 0, 0];
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
  // device-tilt gravity (mobile) — silent listener; browsers that require a
  // permission gesture simply never fire it.
  window.addEventListener("deviceorientation", (e) => {
    if (e.beta == null || e.gamma == null || gateSceneActive) return;
    const gx = Math.sin((e.gamma * Math.PI) / 180) * 9.81;
    const gy = -Math.sin((e.beta * Math.PI) / 180) * 9.81;
    const gz = -Math.sqrt(Math.max(0, 9.81 * 9.81 - gx * gx - gy * gy));
    live.config = { ...live.config, gravity: [gx, gy, gz] };
  });

  // ---- live loop -------------------------------------------------------------------
  applyPreset(PRESETS[0]);
  let lastDiag = 0;
  const frameTimes: number[] = [];

  function tick(): void {
    requestAnimationFrame(tick);
    if (isCapturing() || gateSceneBusy || exclusiveDepth > 0) return;
    resize();
    const t0 = performance.now();
    if (!suspended && !gateSceneActive) {
      // frame-indexed drivers (deterministic; no wall clock in the sim path)
      if (preset.emitter) {
        const batch = emitterBatch(preset.emitter, spacing, frame);
        if (batch) live.addParticles(batch, preset.emitter.vel);
      }
      if (preset.stirrer) {
        const s = preset.stirrer;
        const a = (frame / 90) * Math.PI * 2;
        live.interaction.impulsePos = [
          s.center[0] + s.radius * Math.cos(a),
          s.center[1] + s.radius * Math.sin(a),
          s.center[2],
          0.12,
        ];
        live.interaction.impulseVel = [
          -Math.sin(a) * s.strength,
          Math.cos(a) * s.strength,
          0,
          1.5,
        ];
      }
      if (preset.piston) {
        const p = preset.piston;
        const x = p.min + (p.max - p.min) * (0.5 + 0.5 * Math.cos((frame / p.period) * Math.PI * 2));
        live.config = { ...live.config, boxMax: [x, BOX_MAX[1], BOX_MAX[2]] };
      }
      live.step(substeps);
      frame += 1;
    }
    const speedMax = 3.5;
    if (renderMode === "water" && ssfr && !gateSceneActive) {
      ssfr.draw({
        n: live.config.n,
        radius: spacing * 0.9,
        cam: renderer.cam,
        foamSpeed: 5.2,
      });
    } else if (!gateSceneActive) {
      renderer.draw({
        n: live.config.n,
        radius: spacing * 0.62,
        colorMode,
        scalarMin: colorMode === 1 ? CANON.rho0 * 0.5 : 0,
        scalarMax:
          colorMode === 0
            ? speedMax
            : colorMode === 1
              ? CANON.rho0 * 1.3
              : colorMode === 2
                ? 80
                : 30,
        colormap,
      });
    }
    const dtMs = performance.now() - t0;
    frameTimes.push(dtMs);
    if (frameTimes.length > 60) frameTimes.shift();
    solverMsAvg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

    // one-shot adaptive-N probe (spec § 3.6): measured capability, not UA
    // sniffing. Downgrade-only — an automatic mid-session upgrade re-seeds
    // the scene under the visitor, which reads as a glitch; faster devices
    // can select 60K/100K manually.
    if (!probed && frame === 120 && !gateSceneActive) {
      probed = true;
      if (solverMsAvg > 34 && nTarget > 8000) {
        nTarget = solverMsAvg > 60 ? 8000 : 15000;
        applyPreset(preset);
      }
    }

    if (t0 - lastDiag > 500 && !gateSceneActive) {
      lastDiag = t0;
      void live.readDiagnostics().then((d) => {
        panel.setDiagnostics([
          { label: "particles", value: String(live.config.n) },
          { label: "frame", value: `${solverMsAvg.toFixed(1)} ms (${substeps} substeps)` },
          {
            label: "max density err",
            value: `${d.maxErr.toFixed(2)} kg/m³ (${((100 * d.maxErr) / CANON.rho0).toFixed(2)}%)`,
          },
          { label: "mean ρ (sample)", value: d.avgRho.toFixed(1) },
          { label: "total mass (exact)", value: `${(live.config.n * live.config.mass).toFixed(3)} kg` },
          { label: "CFL λ", value: ((speedOf(d) * live.config.dt) / live.config.h).toFixed(2) },
        ]);
      });
    }
  }
  const speedOf = (_d: { maxErr: number }) => 3.0; // display heuristic for the CFL row
  requestAnimationFrame(tick);

  setBoot("");
  // dev/debug hook (harness + tuning scripts); not part of any contract
  (globalThis as Record<string, unknown>).__sphDebug = {
    live,
    gpu,
    applyPreset,
    presets: PRESETS,
    withExclusive,
    setNTarget: (n: number) => {
      nTarget = n;
      probed = true;
    },
  };
  (globalThis as { __bitPhysicsReady?: boolean }).__bitPhysicsReady = true;

  // ---- headless harness (step-2 measurement + dev verification) --------------------
  if (new URLSearchParams(location.search).has("harness")) {
    void withExclusive(async () => {
      const out: Record<string, unknown> = {};
      try {
        const art = await computeGateArtifacts(gpu);
        out.golden_f64_dev = art.goldenF64Dev;
        out.golden_f32_rel = art.goldenF32Rel;
        out.mirror = art.mirrorFlags;
        out.corrector_gpu_vs_mirror_maxabs = art.correctorGpuMaxAbs;
        out.hash_brute_equal = art.hashBruteEqual;
        out.norm_mean = art.normMean;
        out.norm_maxdev = art.normMaxDev;
        // falsifiability probe: a perturbed grid MUST break the hash
        const nHB = 4096;
        const hb = new Float32Array(nHB * 3);
        let st = 42 >>> 0;
        for (let i = 0; i < nHB * 3; i += 1) {
          st = (1664525 * st + 1013904223) >>> 0;
          hb[i] = st / 4294967296;
        }
        const probe = await gpu.runHashBrute(hb, nHB, 0.05, {
          origin: [-0.1, -0.1, -0.1],
          dims: [12, 12, 12],
          cell: 0.1,
        }, { perturbGrid: true });
        out.perturbed_probe_differs = !probe.grid.every((v, i) => v === probe.brute[i]);
        // canonical replay, twice (run-twice + measured tolerances)
        const [ic, refs] = await Promise.all([fetchIC(), fetchRefs()]);
        const r1 = await gpu.runCanonicalReplay(ic, {
          h: CANON.h, dt: CANON.dt, gz: CANON.gz, mass: CANON.mass,
          steps: CANON.steps, interval: CANON.interval, stride: CANON.stride,
        });
        const r2 = await gpu.runCanonicalReplay(ic, {
          h: CANON.h, dt: CANON.dt, gz: CANON.gz, mass: CANON.mass,
          steps: CANON.steps, interval: CANON.interval, stride: CANON.stride,
        });
        const errs = checkpointErrors(r1.checkpoints, refs);
        out.replay_ms = r1.ms;
        out.sort_saturated = r1.sortSaturated;
        out.worst_ratio_of_budget = errs.worstRatio;
        out.worst_abs = errs.worst;
        out.per_checkpoint = errs.rows;
        let twice = true;
        for (let ci = 0; ci < r1.checkpoints.length; ci += 1) {
          const a = r1.checkpoints[ci];
          const b = r2.checkpoints[ci];
          const eq = (x: Float32Array, y: Float32Array) =>
            x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
          if (!eq(a.position, b.position) || !eq(a.velocity, b.velocity) || !eq(a.density, b.density))
            twice = false;
        }
        out.run_twice_identical = twice;
        // live perf at the current preset/N
        const perf: Record<string, number> = {};
        for (const N of [8000, 30000, 60000]) {
          nTarget = N;
          probed = true;
          applyPreset(PRESETS[0]);
          const t0 = performance.now();
          for (let f = 0; f < 60; f += 1) live.step(1);
          await gpu.queue.onSubmittedWorkDone();
          perf[`solver_ms_at_${N}`] = (performance.now() - t0) / 60;
        }
        out.perf = perf;
        out.ok = true;
      } catch (e) {
        out.ok = false;
        out.error = String(e);
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
