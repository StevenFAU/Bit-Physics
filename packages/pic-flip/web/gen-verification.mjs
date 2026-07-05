// Build-time data spine for the pic-flip web demo (web spec § 5 at
// packages/pic-flip/web/verification-demo-spec.md).
//
// Node builtins ONLY. Reads committed repo sources, verifies every binding
// (the four golden tables, gate assets, gate wiring, tolerances, WGSL/NumPy
// anchors, the canonical-capture observable extract) and emits
// src/generated/verification.json. HARD-FAIL contract: a missing file, an
// unmatched anchor, a SHA drift, or a tolerance mismatch aborts the build —
// the demo must never display values its kernels are not running.
//
// Idempotent: re-running on an unchanged tree produces byte-identical output
// (asserted in CI via `node gen-verification.mjs && git diff --exit-code`).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function fail(msg) {
  console.error(`gen-verification: FAIL — ${msg}`);
  process.exit(1);
}

function read(rel) {
  try {
    return readFileSync(resolve(repoRoot, rel), "utf8");
  } catch {
    fail(`cannot read ${rel}`);
  }
}

function readBytes(rel) {
  try {
    return readFileSync(resolve(repoRoot, rel));
  } catch {
    fail(`cannot read ${rel}`);
  }
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function matchOne(label, text, sourcePath, re) {
  const m = text.match(re);
  if (!m) fail(`anchor '${label}' not found in ${sourcePath}`);
  return m;
}

function anchorLine(label, text, sourcePath, needle) {
  const first = text.indexOf(needle);
  if (first === -1) fail(`anchor '${label}' not found in ${sourcePath}`);
  if (text.indexOf(needle, first + 1) !== -1)
    fail(`anchor '${label}' matches more than once in ${sourcePath}`);
  return text.slice(0, first).split("\n").length;
}

function anchorRange(label, text, sourcePath, startNeedle, endNeedle) {
  const start = anchorLine(label, text, sourcePath, startNeedle);
  const rest = text.split("\n").slice(start - 1);
  let end = start;
  for (let i = 1; i < rest.length; i += 1) {
    if (rest[i].includes(endNeedle)) {
      end = start + i;
      break;
    }
    if (i === rest.length - 1) fail(`anchor '${label}' end '${endNeedle}' not found`);
  }
  return { start, end, lines: rest.slice(0, end - start + 1).join("\n") };
}

function fractionToNumber(s) {
  const parts = String(s).split("/");
  if (parts.length === 1) return Number(parts[0]);
  if (parts.length === 2) return Number(parts[0]) / Number(parts[1]);
  fail(`bad fraction ${s}`);
}

// ---- 1. the four golden tables (embedded verbatim + SHA-pinned) -------------
const tablesDir = "tools/testkit/golden/tables/particle-fluids";
const wtPath = `${tablesDir}/apic-transfer-weights.json`;
const amPath = `${tablesDir}/apic-angular-momentum.json`;
const rtPath = `${tablesDir}/apic-affine-roundtrip.json`;
const tePath = `${tablesDir}/pic-flip-transfer-error.json`;
const wtRaw = read(wtPath);
const amRaw = read(amPath);
const rtRaw = read(rtPath);
const teRaw = read(tePath);
const wt = JSON.parse(wtRaw);
const am = JSON.parse(amRaw);
const rt = JSON.parse(rtRaw);
const te = JSON.parse(teRaw);
if (am.test_points.length !== 3) fail("angular-momentum table != 3 points");
if (rt.test_points.length !== 4) fail("affine-roundtrip table != 4 points");
if (te.test_points.length !== 3) fail("transfer-error table != 3 points");

// Sanity re-derivations (the spine must not carry a value the tables refute):
const exp0 = wt.test_points[0].expected;
if (Math.abs(exp0.samples["x=+0.0000"] - 0.75) > 0) fail("N(0) != 3/4");
if (Math.abs(exp0.dp_diagonal["dx=1.0"] - 0.25) > 0) fail("Dp diag != 1/4 dx^2");
for (const tp of te.test_points) {
  if (tp.expected.coefficient_exact_rational !== "1/9") fail("1/9 coefficient drift");
}
const sampleXs = Object.keys(exp0.samples).map((k) => Number(k.replace("x=", "")));
const sampleNs = Object.keys(exp0.samples).map((k) => exp0.samples[k]);
const fpProbes = wt.test_points[0].inputs.fp_probes.map(fractionToNumber);
if (sampleXs.length !== 10 || fpProbes.length !== 6) fail("weights table shape drift");

// ---- 2. backend reference constants (extracted, never retyped) --------------
const simPy = read("packages/pic-flip/pic_flip/sim.py");
const apicPy = read("packages/pic-flip/pic_flip/reference/apic.py");
const poissonPy = read("packages/pic-flip/pic_flip/reference/poisson_masked.py");
const regPy = read("packages/pic-flip/pic_flip/reference/regularizers.py");
const canonicalDescriptor = matchOne(
  "CANONICAL_DESCRIPTOR",
  simPy,
  "sim.py",
  /CANONICAL_DESCRIPTOR: Final\[str\] = "([^"]+)"/,
)[1];
const canonicalNJacobi = Number(
  matchOne("CANONICAL_N_JACOBI", simPy, "sim.py", /CANONICAL_N_JACOBI: Final\[int\] = ([0-9_]+)/)[1],
);
const canonicalSteps = Number(
  matchOne("CANONICAL_STEP_COUNT", simPy, "sim.py", /CANONICAL_STEP_COUNT: Final\[int\] = ([0-9_]+)/)[1],
);
const canonicalInterval = Number(
  matchOne(
    "CANONICAL_CAPTURE_INTERVAL",
    simPy,
    "sim.py",
    /CANONICAL_CAPTURE_INTERVAL: Final\[int\] = ([0-9_]+)/,
  )[1],
);
if (canonicalNJacobi !== 3000) fail(`CANONICAL_N_JACOBI drifted: ${canonicalNJacobi}`);

// ---- 3. declared tolerance ([overrides.pic-flip], fresh observable budget) --
const tolToml = read("tools/testkit/equivalence/tolerance.toml");
const picTol = matchOne(
  "[overrides.pic-flip]",
  tolToml,
  "tolerance.toml",
  /\[overrides\.pic-flip\]\s*\ncategory = "picflip-observable"\s*\nrelative = ([0-9e.-]+)/,
);
const declaredRel = Number(picTol[1]);

// ---- 4. gate wiring (verify.py + pipeline.py; constants cross-checked) ------
const verifyPy = read("tools/productization/web-deploy/verify.py");
const pipelinePy = read("tools/productization/web-deploy/pipeline.py");
anchorLine("gate fn", verifyPy, "verify.py", "def _gate_pic_flip(");
if (!verifyPy.includes('"pic-flip": "new_canonical"'))
  fail("pic-flip gate kind missing in verify.py");
if (!pipelinePy.includes('"pic-flip": "new_canonical"'))
  fail("pic-flip gate kind missing in pipeline.py");
const tNum = (name) =>
  Number(matchOne(name, verifyPy, "verify.py", new RegExp(`${name} = ([0-9e.-]+)`))[1]);
const gateThresholds = {
  obs_rel: tNum("T_PICFLIP_OBS_REL"),
  golden_f64_abs: tNum("T_PICFLIP_GOLDEN_F64_ABS"),
  ladder_f64_abs: tNum("T_PICFLIP_LADDER_F64_ABS"),
  weights_f32_rel: tNum("T_PICFLIP_WEIGHTS_F32_REL"),
  pou_f32_abs: tNum("T_PICFLIP_POU_F32_ABS"),
  am_f32_rel: tNum("T_PICFLIP_AM_F32_REL"),
  rt_f32_rel: tNum("T_PICFLIP_RT_F32_REL"),
  still_maxspeed: tNum("T_PICFLIP_STILL_MAXSPEED"),
  still_dvol: tNum("T_PICFLIP_STILL_DVOL"),
  hydro_rel: tNum("T_PICFLIP_HYDRO_REL"),
  headroom_factor: Number(
    matchOne("PICFLIP_HEADROOM_FACTOR", verifyPy, "verify.py", /PICFLIP_HEADROOM_FACTOR = ([0-9]+)/)[1],
  ),
};
if (gateThresholds.obs_rel !== declaredRel)
  fail(
    `T_PICFLIP_OBS_REL (${gateThresholds.obs_rel}) != [overrides.pic-flip] relative (${declaredRel})`,
  );

// ---- 5. gate assets (SHA re-verified against the committed sidecar) ---------
const sidecar = JSON.parse(read("packages/pic-flip/web/public/picflip-gate-refs.json"));
const icBytes = readBytes("packages/pic-flip/web/public/picflip-gate-ic.bin");
const refsBytes = readBytes("packages/pic-flip/web/public/picflip-gate-refs.bin");
if (sha256(icBytes) !== sidecar.ic_sha256) fail("picflip-gate-ic.bin SHA drift");
if (sha256(refsBytes) !== sidecar.refs_sha256) fail("picflip-gate-refs.bin SHA drift");
if (icBytes.length !== sidecar.params_as_run.n_particles * 3 * 4) fail("ic.bin size mismatch");
if (refsBytes.length !== sidecar.checkpoints.length * 10 * 8) fail("refs.bin size mismatch");
if (sidecar.params_as_run.n_jacobi !== 600)
  fail("web-gate n_jacobi drifted from the measured-converged diagnostic cap (600)");
// Embed the reference rows so the app compares against build-verified values
// (the runtime ALSO fetches + SHA-checks the bin itself — double binding).
const refRows = [];
for (let c = 0; c < sidecar.checkpoints.length; c += 1) {
  const row = [];
  for (let o = 0; o < 10; o += 1) {
    row.push(refsBytes.readDoubleLE((c * 10 + o) * 8));
  }
  refRows.push(row);
}

// ---- 6. canonical capture (manifest + committed-h5 observable extract) ------
const capManifest = JSON.parse(
  read(`tests/fixtures/legacy-captures/${canonicalDescriptor}.json`),
);
const canonObs = JSON.parse(read("packages/pic-flip/web/public/picflip-canonical-obs.json"));
if (canonObs.payload_sha256 !== capManifest.payload.checksum.replace("sha256:", ""))
  fail("canonical-obs extract payload SHA != committed manifest");
if (canonObs.descriptor !== canonicalDescriptor) fail("canonical-obs descriptor drift");
if (capManifest.config.params.n_jacobi !== canonicalNJacobi)
  fail("manifest n_jacobi != CANONICAL_N_JACOBI");
if (canonObs.checkpoints.length !== canonicalSteps / canonicalInterval + 1)
  fail("canonical-obs checkpoint count drift");

// ---- 7. WGSL + NumPy code anchors (EXPLAIN equation->code bindings) ----------
const coreWgsl = read("packages/pic-flip/src/picflip_core.wgsl");
const codeAnchors = {
  bspline_weights: anchorRange(
    "bspline_weights",
    coreWgsl,
    "picflip_core.wgsl",
    "fn bspline_weights(fp: f32)",
    "}",
  ),
  p2g: { start: anchorLine("p2g", coreWgsl, "picflip_core.wgsl", "fn p2g(") },
  p2g_oracle: {
    start: anchorLine("p2g_oracle", coreWgsl, "picflip_core.wgsl", "fn p2g_oracle("),
  },
  compute_rhs: {
    start: anchorLine("compute_rhs", coreWgsl, "picflip_core.wgsl", "fn compute_rhs("),
  },
  jacobi_iter: {
    start: anchorLine("jacobi_iter", coreWgsl, "picflip_core.wgsl", "fn jacobi_iter("),
  },
  rbgs_red: { start: anchorLine("rbgs_red", coreWgsl, "picflip_core.wgsl", "fn rbgs_red(") },
  grad_update: {
    start: anchorLine("grad_update", coreWgsl, "picflip_core.wgsl", "fn grad_update("),
  },
  extrap_layer: {
    start: anchorLine("extrap_layer", coreWgsl, "picflip_core.wgsl", "fn extrap_layer("),
  },
  g2p: { start: anchorLine("g2p", coreWgsl, "picflip_core.wgsl", "fn g2p(") },
  advect: { start: anchorLine("advect", coreWgsl, "picflip_core.wgsl", "fn advect(") },
  pp_jacobi: {
    start: anchorLine("pp_jacobi", coreWgsl, "picflip_core.wgsl", "fn pp_jacobi("),
  },
};
const pyAnchors = {
  p2g_3d_line: anchorLine("p2g_3d", apicPy, "apic.py", "def p2g_3d("),
  g2p_3d_line: anchorLine("g2p_3d", apicPy, "apic.py", "def g2p_3d("),
  advect_rk2_3d_line: anchorLine("advect_rk2_3d", apicPy, "apic.py", "def advect_rk2_3d("),
  apic_step_3d_line: anchorLine("apic_step_3d", apicPy, "apic.py", "def apic_step_3d("),
  n_substeps_line: anchorLine("_n_substeps", apicPy, "apic.py", "def _n_substeps("),
  divergence_line: anchorLine(
    "divergence_masked_3d",
    poissonPy,
    "poisson_masked.py",
    "def divergence_masked_3d(",
  ),
  jacobi_line: anchorLine("_jacobi_masked", poissonPy, "poisson_masked.py", "def _jacobi_masked("),
  project_line: anchorLine("_project_masked", poissonPy, "poisson_masked.py", "def _project_masked("),
  extrapolate_line: anchorLine("_extrapolate", poissonPy, "poisson_masked.py", "def _extrapolate("),
  push_apart_3d_line: anchorLine("push_apart_3d", regPy, "regularizers.py", "def push_apart_3d("),
  drift_rhs_line: anchorLine("_drift_rhs", regPy, "regularizers.py", "def _drift_rhs("),
  rest_density_line: anchorLine(
    "measure_rest_density",
    regPy,
    "regularizers.py",
    "def measure_rest_density(",
  ),
  canonical_n_jacobi_line: anchorLine(
    "CANONICAL_N_JACOBI",
    simPy,
    "sim.py",
    "CANONICAL_N_JACOBI: Final[int] =",
  ),
};

// ---- 8. measured record (spec measured-then-declared block) ------------------
const specMd = read("packages/pic-flip/web/verification-demo-spec.md");
let measured = { status: "pending", note: "step-2 harness measurement not yet recorded in spec" };
const mm = specMd.match(
  /MEASURED \(browser, ([^)]+)\): worst_ratio_of_budget=([0-9.e-]+); worst_observable=([^;]+); run_twice=([a-z]+); weights_f32_rel=([0-9.e-]+); pou_f32_abs=([0-9.e-]+); am_f32_cons_rel=([0-9.e-]+); rt_f32_rel=([0-9.e-]+); bit_identity=([a-z]+); fp_headroom=([0-9.e-]+); still_max_speed=([0-9.e-]+); hydro_dpdz_rel=([0-9.e-]+)/,
);
if (mm) {
  measured = {
    status: "recorded",
    provenance: mm[1],
    worst_ratio_of_budget: Number(mm[2]),
    worst_observable: mm[3],
    run_twice: mm[4] === "true",
    weights_f32_rel: Number(mm[5]),
    pou_f32_abs: Number(mm[6]),
    am_f32_cons_rel: Number(mm[7]),
    rt_f32_rel: Number(mm[8]),
    bit_identity: mm[9] === "true",
    fp_headroom: Number(mm[10]),
    still_max_speed: Number(mm[11]),
    hydro_dpdz_rel: Number(mm[12]),
  };
}

// ---- 9. citation ledger (verified 2026-07-04, web spec § 2.2) -----------------
const citations = [
  { key: "JSSTS15", ref: "Jiang, Schroeder, Selle, Teran & Stomakhin 2015, ACM TOG 34(4) — APIC; tech-report Props 5.1/5.4/5.5 are the golden anchors", doi: "10.1145/2766996" },
  { key: "JST17", ref: "Jiang, Schroeder & Teran 2017, JCP 338 — angular-momentum-conserving APIC; the integrator caveat (transfer-level exactness needs a compatible integrator end-to-end)", doi: "10.1016/j.jcp.2017.02.050" },
  { key: "ZB05", ref: "Zhu & Bridson 2005, ACM TOG 24(3) — graphics PIC/FLIP; thesis eq. (3.8) is the 1/9 transfer-error golden", doi: "10.1145/1073204.1073298" },
  { key: "Course16", ref: "Jiang et al., SIGGRAPH 2016 course — Dp = (1/4) dx^2 I for the quadratic B-spline (§ 10.1 eq. 174)", doi: "10.1145/2897826.2927348" },
  { key: "Hu18", ref: "Hu et al. 2018 — MLS-MPM; the shared affine-transfer stencil (repo cross-anchor to the MPM golden)", doi: "10.1145/3197517.3201293" },
  { key: "Muller-TMP18", ref: "Müller, Ten Minute Physics #18 — the practitioner FLIP recipe: push-apart + density drift compensation ('necessary'), solid-face restore; his k=1 survives only an unconverged solve (backend § 3 measured deviation: k=0.05 vs a converged masked solve)", url: "https://matthias-research.github.io/pages/tenMinutePhysics/18-flip.html" },
  { key: "GPUGems3-30", ref: "Crane, Llamas & Tariq — GPU Gems 3 ch. 30: Jacobi/GS propagate ~1 cell/sweep — 'water sinks through the tank floor' at shallow iteration counts (the backend's pinned documented-failure: 20 sweeps retain 100% of g dt)", url: "https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids" },
  { key: "Ding20", ref: "Ding, Shinar & Schroeder 2020 — APIC on MAC grids (the v2 formulation); APIC dissipates even at dt=0 where FLIP does not (honesty caveat c)", arxiv: "1911.09883" },
  { key: "TruongYuksel18", ref: "Truong & Yuksel 2018, PACMCGIT — narrow-range filter (the SSFR pipeline, reused from sph-water)", doi: "10.1145/3203201" },
  { key: "GPUGems3-39", ref: "Harris, Sengupta & Owens — GPU Gems 3 ch. 39, work-efficient Blelloch scan (the counting-sort broadphase, reused from sph-water)", url: "https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda" },
  { key: "jeantimex", ref: "jeantimex/fluid — closest browser peer (WebGPU PIC/FLIP, RBGS ~2x Jacobi, whitewater); no APIC, no conservation instrumentation, no correctness claim", url: "https://github.com/jeantimex/fluid" },
  { key: "matsuoka", ref: "matsuoka-601 WebGPU-Ocean / WaterBall — MLS-MPM with Tait EOS: NO pressure Poisson at all (the positioning FACT: the famous WebGPU water demos avoid the solver this demo verifies)", url: "https://github.com/matsuoka-601/webgpu-ocean" },
];

// ---- 10. links (existence-checked) --------------------------------------------
const links = {
  kernel_core: "packages/pic-flip/src/picflip_core.wgsl",
  reference_apic: "packages/pic-flip/pic_flip/reference/apic.py",
  reference_poisson: "packages/pic-flip/pic_flip/reference/poisson_masked.py",
  reference_regularizers: "packages/pic-flip/pic_flip/reference/regularizers.py",
  sim: "packages/pic-flip/pic_flip/sim.py",
  invariants: "packages/pic-flip/pic_flip/invariants.py",
  spec_ref: "docs/sim-specs/particle-fluids/pic-flip/spec-ref.md",
  algebraic: "docs/sim-specs/particle-fluids/pic-flip/algebraic.md",
  golden_weights: wtPath,
  golden_am: amPath,
  golden_rt: rtPath,
  golden_te: tePath,
  derivation_transfers: "tools/testkit/golden/derivations/apic-transfers.md",
  derivation_te: "tools/testkit/golden/derivations/pic-flip-transfer-error.md",
  tolerance_table: "tools/testkit/equivalence/tolerance.toml",
  gate_source: "tools/productization/web-deploy/verify.py",
  spec: "packages/pic-flip/web/verification-demo-spec.md",
  capture_manifest: `tests/fixtures/legacy-captures/${canonicalDescriptor}.json`,
  gate_refs_generator: "packages/pic-flip/web/tools/gen-gate-refs.py",
  canonical_extractor: "packages/pic-flip/web/tools/extract-canonical-obs.py",
};
for (const rel of Object.values(links)) read(rel);

// ---- emit ----------------------------------------------------------------------
const out = {
  _generated_by:
    "packages/pic-flip/web/gen-verification.mjs — do not edit; every value is extracted from committed sources and HARD-FAIL verified",
  sim: "pic-flip",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  canonical: {
    descriptor: canonicalDescriptor,
    step_count: canonicalSteps,
    capture_interval: canonicalInterval,
    n_jacobi: canonicalNJacobi,
    params_as_run: capManifest.config.params,
    payload_sha256: capManifest.payload.checksum.replace("sha256:", ""),
    wall_clock_seconds: capManifest.run.wall_clock_seconds,
    reference_determinism: capManifest.determinism.claimed,
    checkpoints: canonObs.checkpoints,
    observables: canonObs.observables,
    observables_layout: canonObs.layout,
  },
  gate: {
    kind: "new_canonical",
    declared_rel: declaredRel,
    thresholds: gateThresholds,
    criterion:
      "run-twice byte-identity + ROBUST OBSERVABLES (KE/momentum/com/max-speed/fluid-nodes/column-height) vs the committed f64 web-gate references within rel " +
      declaredRel +
      " of per-observable scale (chaotic dam break — per-particle pointwise REJECTED per spec § 9) + Props 5.1/5.4/5.5 golden suite with PIC negative controls + Zhu 1/9 dyadic-exact ladder + on-device atomic==lex-oracle bit identity + still-pool inertness + adjoint-compact-pair hydrostatic probe",
    measured,
  },
  gate_assets: {
    ic: { path: "picflip-gate-ic.bin", sha256: sidecar.ic_sha256, bytes: sidecar.ic_bytes, layout: sidecar.ic_layout },
    refs: { path: "picflip-gate-refs.bin", sha256: sidecar.refs_sha256, bytes: sidecar.refs_bytes, layout: sidecar.refs_layout },
    ic_sha256: sidecar.ic_sha256,
    refs_sha256: sidecar.refs_sha256,
    descriptor: sidecar.descriptor,
    params_as_run: sidecar.params_as_run,
    step_count: sidecar.step_count,
    capture_interval: sidecar.capture_interval,
    checkpoints: sidecar.checkpoints,
    ref_rows: refRows,
    observables_layout: sidecar.refs_layout,
  },
  golden: {
    weights_table_sha256: sha256(wtRaw),
    weights_sample_xs: sampleXs,
    weights_sample_ns: sampleNs,
    weights_fp_probes: fpProbes,
    weights_fp_probes_exact: wt.test_points[0].inputs.fp_probes,
    weights_tolerance: wt.tolerance,
    am_table_sha256: sha256(amRaw),
    am_points: am.test_points,
    am_tolerance: am.tolerance,
    rt_table_sha256: sha256(rtRaw),
    rt_points: rt.test_points,
    rt_tolerance: rt.tolerance,
    te_table_sha256: sha256(teRaw),
    te_points: te.test_points,
    te_tolerance: te.tolerance,
  },
  determinism: {
    reference_claimed: capManifest.determinism.claimed,
    browser_claimed:
      "device-scoped bit-exact (same-device run-twice; fixed-point i32-atomic P2G is order-independent); cross-device distributional",
    deviations_note:
      "DECLARED deviations from the reference: (1) push-apart is a symmetric Jacobi accumulate over id-sorted CSR neighbors instead of the serial Gauss-Seidel sweep (deterministic, exactly inert at rest, transients differ — absorbed by the robust-observable budget); (2) the live path may use RBGS+SOR and warm start (labeled, never gated); (3) f32 state + fixed-point P2G quanta (2^-21) vs the f64 reference — why the gate is observable-level, never pointwise",
  },
  code_anchors: codeAnchors,
  py_anchors: pyAnchors,
  citations,
  links,
};

mkdirSync(resolve(here, "src/generated"), { recursive: true });
writeFileSync(
  resolve(here, "src/generated/verification.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log("gen-verification: OK — src/generated/verification.json");
