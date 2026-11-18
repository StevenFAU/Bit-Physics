// The release gate's capture, ported verbatim from the v1 page
// (packages/sph-water/web/src/main.ts: CANON, fetchIC/fetchRefs,
// checkpointErrors, computeGateArtifacts, captureCanonicalInner). Gate
// kernels are frozen (00-foundation.md § 5): the same GPU orchestration
// (src/solver.ts createSphGpu — the same sph_core.wgsl and dfsph_solver.wgsl,
// the same layout-"auto" pipelines and bind groups), the same pinned
// canonical parameters (h = 0.026, the CANONICAL_H the committed capture
// actually ran — not the manifest's 0.05), the same committed f32 IC, the
// same 1000 explicit-Euler gravity steps with the optimized grid density at
// every 100th, the same ::16 subsample, the same closed-form artifacts at
// step 0 (golden kernel, two-particle fixture, the in-page f64 mirror,
// hash==brute at N = 4096, the kernel-normalisation check) and v1's
// manifest. verify.py's _gate_sph_water applies the established
// new_canonical gate unchanged: run-twice byte identity plus the pointwise
// match against the committed 100K capture within [defaults.sph] rel 1e-4.
//
// The gate runs on its own createSphGpu instance — its own uniforms and
// buffers: nothing the live page draws or the visitor changes reaches it.
// v1's traps are kept: the per-cell id-sort (run-twice byte identity), the
// CSR cell_start (eight storage buffers at most per pass), and the
// exclusivity guard — `busy` holds the live loop off the GPU while a run is
// in flight, as v1's withExclusive did.

import V from "../../generated/verification.json";
import FIX from "../../../fixtures/reference-fixtures.json";
import { createSphGpu } from "../../solver.js";
import type { CheckpointData, SphGpu } from "../../solver.js";
import { compareBitExact, kernelGradWMag, kernelW, mirrorContinuity, mirrorCorrector, mirrorDensity } from "../../mirror.js";
import { simAsset } from "../../sim-root.js";
import type { CaptureBundle, CaptureManifestLike, CaptureStepDescriptor } from "@bp/verify";
import { field } from "@bp/verify";

/** The repository's blob base (links in Learn and Prove). */
export const REPO_BLOB = "https://github.com/StevenFAU/Bit-Physics/blob/main/";

// ---- canonical constants (must agree with the data spine — HARD CHECK) ------
export const CANON = {
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
  throw new Error("verification.json canonical values drifted from compute constants — rerun gen-verification.mjs");
}

/** The declared budget: [defaults.sph] relative, via [overrides.sph-water]. */
export const T_SPH_REL: number = V.gate.declared_rel;

async function sha256hex(data: ArrayBufferView): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- lazy gate assets (v1: "./sph-gate-ic.bin"; v2 resolves the sim root) ---
let icCache: Float32Array | null = null;
export async function fetchIC(): Promise<Float32Array> {
  if (icCache) return icCache;
  const r = await fetch(simAsset("sph-gate-ic.bin"));
  if (!r.ok) throw new Error("sph-gate-ic.bin fetch failed");
  icCache = new Float32Array(await r.arrayBuffer());
  if (icCache.length !== CANON.n * 3) throw new Error("ic.bin size mismatch");
  return icCache;
}

let refsCache: Float64Array | null = null;
export async function fetchRefs(): Promise<Float64Array> {
  if (refsCache) return refsCache;
  const r = await fetch(simAsset("sph-gate-refs.bin"));
  if (!r.ok) throw new Error("sph-gate-refs.bin fetch failed");
  refsCache = new Float64Array(await r.arrayBuffer());
  return refsCache;
}

export const SUB_COUNT = Math.ceil(CANON.n / CANON.stride);

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
        posAbs = Math.max(posAbs, Math.abs(cp.position[k * 3 + c]! - refs[base + c]!));
        velAbs = Math.max(velAbs, Math.abs(cp.velocity[k * 3 + c]! - refs[base + 3 + c]!));
        maxP = Math.max(maxP, Math.abs(cp.position[k * 3 + c]!));
        maxV = Math.max(maxV, Math.abs(cp.velocity[k * 3 + c]!));
      }
      rhoAbs = Math.max(rhoAbs, Math.abs(cp.density[k]! - refs[base + 6]!));
      maxR = Math.max(maxR, Math.abs(cp.density[k]!));
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
    kernelW32[i] = k32[i * 2]!;
    kernelG32[i] = k32[i * 2 + 1]!;
  });
  const c1 = (FIX.kernel_coeffs as Record<string, { sigma_h3: number; sigma_h4: number }>)["1.0"]!;
  const kernelW64 = new Float64Array(pts.length);
  const kernelG64 = new Float64Array(pts.length);
  let goldenF64Dev = 0;
  let goldenF32Rel = 0;
  V.golden.kernel_points.forEach((p, i) => {
    kernelW64[i] = kernelW(p.q, c1);
    kernelG64[i] = kernelGradWMag(p.q, c1);
    goldenF64Dev = Math.max(goldenF64Dev, Math.abs(kernelW64[i]! - p.W), Math.abs(kernelG64[i]! - p.grad_W_magnitude));
    const sw = Math.max(Math.abs(p.W), 1e-30);
    const sg = Math.max(Math.abs(p.grad_W_magnitude), 1e-30);
    goldenF32Rel = Math.max(goldenF32Rel, Math.abs(kernelW32[i]! - p.W) / sw, Math.abs(kernelG32[i]! - p.grad_W_magnitude) / sg);
  });

  // f64 mirror vs committed reference-computed fixtures (bit-exact target)
  const two = FIX.two_particle;
  const twoPos = new Float64Array(two.particles.flatMap((p) => p.p));
  const twoVel = new Float64Array(two.particles.flatMap((p) => p.v));
  const twoMass = new Float64Array(two.particles.map((p) => p.m));
  const twoRho = mirrorDensity(twoPos, twoMass, 2, two.h, c1);
  const twoDrho = mirrorContinuity(twoPos, twoVel, twoMass, 2, two.h, c1);
  const twoOk = compareBitExact("two_rho", twoRho, two.rho).bitExact && compareBitExact("two_drho", twoDrho, two.drho_dt).bitExact;

  const cH = (FIX.kernel_coeffs as Record<string, { sigma_h3: number; sigma_h4: number }>)[String(FIX.density_64.h)]!;
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
  const corr = mirrorCorrector(p8, v8, m8, 8, c8.h, c8.max_iter, c8.tolerance, c8.rho_0, cH);
  const corrector8Ok = compareBitExact("corr8", corr.vel, new Float64Array(c8.corrected_velocities.flat())).bitExact;

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
  for (let i = 0; i < 24; i += 1) correctorGpuMaxAbs = Math.max(correctorGpuMaxAbs, Math.abs(gpuCorr.velocities[i]! - corr.vel[i]!));

  // hash==brute at N=4096 on a seeded deterministic cloud (LCG — no RNG state)
  const nHB = 4096;
  const hb = new Float32Array(nHB * 3);
  let st = 42 >>> 0;
  const lcg = (): number => {
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
  const hashBruteEqual = grid.length === brute.length && grid.every((v, i) => v === brute[i]);
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

/** The canonical replay at the pinned parameters (v1's call, verbatim). */
function replay(gpu: SphGpu, ic: Float32Array, onProgress?: (step: number) => void): ReturnType<SphGpu["runCanonicalReplay"]> {
  return gpu.runCanonicalReplay(ic, {
    h: CANON.h,
    dt: CANON.dt,
    gz: CANON.gz,
    mass: CANON.mass,
    steps: CANON.steps,
    interval: CANON.interval,
    stride: CANON.stride,
    onProgress,
  });
}

export interface GateCapture {
  bundle: CaptureBundle;
  checkpoints: CheckpointData[];
  sortSaturated: boolean;
  artifacts: GateArtifacts;
  ms: number;
}

/** The gate path: v1's capture on its own createSphGpu instance. */
export class GateRunner {
  /** A run is in flight: the live loop stays off the GPU (v1's withExclusive). */
  busy = 0;

  private constructor(readonly gpu: SphGpu) {}

  static async create(device: GPUDevice): Promise<GateRunner> {
    return new GateRunner(await createSphGpu(device));
  }

  async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    this.busy += 1;
    try {
      return await fn();
    } finally {
      this.busy -= 1;
    }
  }

  /** v1's captureCanonicalInner: the replay, the artifacts, v1's bundle. */
  capture(onStatus?: (msg: string) => void): Promise<GateCapture> {
    return this.exclusive(async () => {
      const gpu = this.gpu;
      onStatus?.("capturing canonical (1000 steps + 11 density fields @100K)…");
      const ic = await fetchIC();
      const t0 = performance.now();
      const res = await replay(gpu, ic, (s) => onStatus?.(`canonical replay: step ${s}/1000`));
      onStatus?.("computing gate artifacts…");
      const art = await computeGateArtifacts(gpu);
      const steps: CaptureStepDescriptor[] = res.checkpoints.map((cp) => {
        const state: CaptureStepDescriptor["state"] = {
          position: field(cp.position, [SUB_COUNT, 3], "f32"),
          velocity: field(cp.velocity, [SUB_COUNT, 3], "f32"),
          density: field(cp.density, [SUB_COUNT], "f32"),
        };
        let meanRho = 0;
        for (let i = 0; i < cp.density.length; i += 1) meanRho += cp.density[i]!;
        meanRho /= Math.max(cp.density.length, 1);
        let maxSpeed = 0;
        for (let i = 0; i < SUB_COUNT; i += 1) {
          const s = Math.hypot(cp.velocity[i * 3]!, cp.velocity[i * 3 + 1]!, cp.velocity[i * 3 + 2]!);
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
          state.nsearch_grid_fp = field(Float64Array.from(art.nsearchGrid), [art.nsearchGrid.length], "f64");
          state.nsearch_brute_fp = field(Float64Array.from(art.nsearchBrute), [art.nsearchBrute.length], "f64");
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
      return {
        bundle: { manifest, steps },
        checkpoints: res.checkpoints,
        sortSaturated: res.sortSaturated,
        artifacts: art,
        ms: performance.now() - t0,
      };
    });
  }

  /** The Prove card's run: the replay twice, checked in the page as verify.py checks it. */
  check(onStatus?: (msg: string) => void): Promise<GateCheck> {
    return this.exclusive(async () => {
      const [ic, refs] = await Promise.all([fetchIC(), fetchRefs()]);
      const t0 = performance.now();
      onStatus?.("Replaying the committed canonical (first run)…");
      const r1 = await replay(this.gpu, ic, (s) => onStatus?.(`First run: step ${s} of 1000`));
      onStatus?.("Replaying it again (second run)…");
      const r2 = await replay(this.gpu, ic, (s) => onStatus?.(`Second run: step ${s} of 1000`));
      const errs = checkpointErrors(r1.checkpoints, refs);
      const eq = (x: Float32Array, y: Float32Array): boolean => x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
      let twice = r1.checkpoints.length === r2.checkpoints.length;
      for (let ci = 0; twice && ci < r1.checkpoints.length; ci += 1) {
        const a = r1.checkpoints[ci]!;
        const b = r2.checkpoints[ci]!;
        if (!eq(a.position, b.position) || !eq(a.velocity, b.velocity) || !eq(a.density, b.density)) twice = false;
      }
      return {
        worstRatio: errs.worstRatio,
        worst: errs.worst,
        rows: errs.rows,
        runTwiceIdentical: twice,
        sortSaturated: r1.sortSaturated || r2.sortSaturated,
        passed: twice && errs.worstRatio <= 1 && !r1.sortSaturated && !r2.sortSaturated,
        ms: performance.now() - t0,
      };
    });
  }
}

export interface GateCheck {
  worstRatio: number;
  worst: { position: number; velocity: number; density: number };
  rows: CheckpointErrors[];
  runTwiceIdentical: boolean;
  sortSaturated: boolean;
  passed: boolean;
  ms: number;
}

/** sha256 of a capture's states (every field's values, in step order): v1 ≡ v2 and run-twice checks. */
export async function captureStatesSha(steps: readonly CaptureStepDescriptor[]): Promise<string> {
  const text = JSON.stringify(steps.map((s) => ({ step: s.step, state: s.state })));
  return sha256hex(new TextEncoder().encode(text));
}
