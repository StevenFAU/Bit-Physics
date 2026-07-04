// Build-time data spine for the sph-water web demo (spec § 5 at
// packages/sph-water/web/verification-demo-spec.md).
//
// Node builtins ONLY. Reads committed repo sources, verifies every binding
// (golden tables, gate assets, gate wiring, tolerances, WGSL/NumPy anchors)
// and emits src/generated/verification.json. HARD-FAIL contract: a missing
// file, an unmatched anchor, a SHA drift, or a tolerance mismatch aborts the
// build — the demo must never display values its kernels are not running.
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

// Exactly-one occurrence of `needle`; returns 1-based line number.
function anchorLine(label, text, sourcePath, needle) {
  const first = text.indexOf(needle);
  if (first === -1) fail(`anchor '${label}' not found in ${sourcePath}`);
  if (text.indexOf(needle, first + 1) !== -1)
    fail(`anchor '${label}' matches more than once in ${sourcePath}`);
  return text.slice(0, first).split("\n").length;
}

// Line range + verbatim lines from `startNeedle` through the next `endNeedle`.
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

// ---- 1. golden tables (embedded verbatim + SHA-pinned) ----------------------
const kernelTablePath = "tools/testkit/golden/tables/cubic-spline-kernel.json";
const fixtureTablePath =
  "tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json";
const kernelTableRaw = read(kernelTablePath);
const fixtureTableRaw = read(fixtureTablePath);
const kernelTable = JSON.parse(kernelTableRaw);
const fixtureTable = JSON.parse(fixtureTableRaw);
if (kernelTable.test_points.length !== 9) fail("kernel golden table != 9 points");
if (Math.abs(kernelTable.test_points[0].expected.W - 1 / Math.PI) > 1e-15)
  fail("kernel golden W(0) != 1/pi — support-2h convention broken?");

// ---- 2. reference params (frozen; extracted, never retyped) -----------------
const dfsphPy = read("packages/sph-water/sph_water/reference/dfsph.py");
const simPy = read("packages/sph-water/sph_water/sim.py");
const canonicalH = Number(
  matchOne("CANONICAL_H", simPy, "sim.py", /CANONICAL_H: Final\[float\] = ([0-9.]+)/)[1],
);
const canonicalN = Number(
  matchOne("CANONICAL_N", simPy, "sim.py", /CANONICAL_N_PARTICLES: Final\[int\] = ([0-9_]+)/)[1].replaceAll("_", ""),
);
const canonicalSteps = Number(
  matchOne("CANONICAL_STEPS", simPy, "sim.py", /CANONICAL_STEP_COUNT: Final\[int\] = ([0-9_]+)/)[1].replaceAll("_", ""),
);
const canonicalInterval = Number(
  matchOne("CANONICAL_INTERVAL", simPy, "sim.py", /CANONICAL_CAPTURE_INTERVAL: Final\[int\] = ([0-9_]+)/)[1],
);
const pBlock = matchOne(
  "canonical_params",
  dfsphPy,
  "dfsph.py",
  /def canonical_params\(\)[\s\S]*?return \{([\s\S]*?)\}/,
)[1];
const pNum = (key) =>
  Number(matchOne(key, pBlock, "canonical_params", new RegExp(`"${key}": (-?[0-9e.-]+)`))[1]);
const refParams = {
  h_diagnostic: pNum("h"),
  rho_0: pNum("rho_0"),
  dt: pNum("dt"),
  g_z: pNum("g_z"),
  max_iter_divergence: pNum("max_iter_divergence"),
  divergence_tolerance: pNum("divergence_tolerance"),
};
if (canonicalH !== 0.026) fail(`CANONICAL_H drifted: ${canonicalH}`);

// ---- 3. declared tolerance (category default, resolution-wired) -------------
const tolToml = read("tools/testkit/equivalence/tolerance.toml");
const sphDefaults = matchOne(
  "[defaults.sph]",
  tolToml,
  "tolerance.toml",
  /\[defaults\.sph\]\s*\nrelative = ([0-9e.-]+)\s*\nabsolute = ([0-9e.-]+)/,
);
const declared = { relative: Number(sphDefaults[1]), absolute: Number(sphDefaults[2]) };
if (!tolToml.includes("[overrides.sph-water]"))
  fail("[overrides.sph-water] missing from tolerance.toml");

// ---- 4. gate wiring (both files; constants extracted, cross-checked) --------
const verifyPy = read("tools/productization/web-deploy/verify.py");
const pipelinePy = read("tools/productization/web-deploy/pipeline.py");
anchorLine("gate fn", verifyPy, "verify.py", "def _gate_sph_water(");
if (!verifyPy.includes('"sph-water": "new_canonical"'))
  fail("sph-water gate kind missing in verify.py");
if (!pipelinePy.includes('"sph-water": "new_canonical"'))
  fail("sph-water gate kind missing in pipeline.py");
const tNum = (name) =>
  Number(matchOne(name, verifyPy, "verify.py", new RegExp(`${name} = ([0-9e.-]+)`))[1]);
const gateThresholds = {
  traj_rel: tNum("T_SPH_TRAJ_REL"),
  golden_f64_abs: tNum("T_SPH_GOLDEN_F64_ABS"),
  fixture_f64_abs: tNum("T_SPH_FIXTURE_F64_ABS"),
  kernel_f32_rel: tNum("T_SPH_KERNEL_F32_REL"),
  norm_tol: tNum("T_SPH_NORM_TOL"),
  stride: Number(
    matchOne("SPH_GATE_STRIDE", verifyPy, "verify.py", /SPH_GATE_STRIDE = ([0-9]+)/)[1],
  ),
};
if (gateThresholds.traj_rel !== declared.relative)
  fail(
    `T_SPH_TRAJ_REL (${gateThresholds.traj_rel}) != [defaults.sph] relative (${declared.relative})`,
  );

// ---- 5. gate assets (SHA re-verified against the committed sidecar) ---------
const sidecar = JSON.parse(read("packages/sph-water/web/public/sph-gate-refs.json"));
const icBytes = readBytes("packages/sph-water/web/public/sph-gate-ic.bin");
const refsBytes = readBytes("packages/sph-water/web/public/sph-gate-refs.bin");
if (sha256(icBytes) !== sidecar.ic_sha256) fail("sph-gate-ic.bin SHA drift");
if (sha256(refsBytes) !== sidecar.refs_sha256) fail("sph-gate-refs.bin SHA drift");
if (icBytes.length !== canonicalN * 3 * 4) fail("ic.bin size mismatch");
const nCheckpoints = canonicalSteps / canonicalInterval + 1;
const subCount = Math.ceil(canonicalN / gateThresholds.stride);
if (sidecar.subsample_stride !== gateThresholds.stride)
  fail("sidecar stride != verify.py SPH_GATE_STRIDE");
if (refsBytes.length !== nCheckpoints * subCount * 7 * 8) fail("refs.bin size mismatch");
if (sidecar.params_as_run.h !== canonicalH)
  fail("sidecar params_as_run.h != CANONICAL_H");
const capManifest = JSON.parse(
  read("captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json"),
);
if (
  sidecar.capture_payload_sha256 !==
  capManifest.payload.checksum.replace("sha256:", "")
)
  fail("sidecar capture payload SHA != committed manifest");

// ---- 6. mirror fixtures ------------------------------------------------------
const fixturesRaw = read("packages/sph-water/web/fixtures/reference-fixtures.json");
const fixtures = JSON.parse(fixturesRaw);
const goldenExp = fixtureTable.test_points[0].expected;
if (Math.abs(fixtures.two_particle.rho[0] - goldenExp.rho_0) > 1e-15)
  fail("fixtures two_particle rho drifted from golden table");
if (Math.abs(fixtures.two_particle.drho_dt[0] - goldenExp.drho_dt_0) > 1e-15)
  fail("fixtures two_particle drho drifted from golden table");

// ---- 7. WGSL + NumPy code anchors (EXPLAIN equation->code bindings) ----------
const coreWgsl = read("packages/sph-water/src/sph_core.wgsl");
const dfWgsl = read("packages/sph-water/src/dfsph_solver.wgsl");
const codeAnchors = {
  kernel_f: anchorRange("kernel_f", coreWgsl, "sph_core.wgsl", "fn kernel_f(q: f32)", "}"),
  kernel_fprime: anchorRange(
    "kernel_fprime",
    coreWgsl,
    "sph_core.wgsl",
    "fn kernel_fprime(q: f32)",
    "}",
  ),
  kernel_W: anchorRange("kernel_W", coreWgsl, "sph_core.wgsl", "fn kernel_W(q: f32, h: f32)", "}"),
  density_grid: {
    start: anchorLine("density_grid", coreWgsl, "sph_core.wgsl", "fn density_grid("),
  },
  continuity_grid: {
    start: anchorLine("continuity_grid", coreWgsl, "sph_core.wgsl", "fn continuity_grid("),
  },
  integrate_canonical: anchorRange(
    "integrate_canonical",
    coreWgsl,
    "sph_core.wgsl",
    "fn integrate_canonical(",
    "}",
  ),
  density_brute_fp: {
    start: anchorLine("density_brute_fp", coreWgsl, "sph_core.wgsl", "fn density_brute_fp("),
  },
  cell_sort: { start: anchorLine("cell_sort", coreWgsl, "sph_core.wgsl", "fn cell_sort(") },
  corrector_fixture: {
    start: anchorLine("corrector_fixture", coreWgsl, "sph_core.wgsl", "fn corrector_fixture("),
  },
  df_alpha: {
    start: anchorLine("df_density_alpha", dfWgsl, "dfsph_solver.wgsl", "fn df_density_alpha("),
  },
  df_predict_density: {
    start: anchorLine("df_predict_density", dfWgsl, "dfsph_solver.wgsl", "fn df_predict_density("),
  },
  df_predict_divergence: {
    start: anchorLine(
      "df_predict_divergence",
      dfWgsl,
      "dfsph_solver.wgsl",
      "fn df_predict_divergence(",
    ),
  },
  df_warm_start: {
    start: anchorLine("df_warm_start", dfWgsl, "dfsph_solver.wgsl", "fn df_warm_start("),
  },
};
const pyAnchors = {
  f_line: anchorLine("_f", dfsphPy, "dfsph.py", "def _f(q: float) -> float:"),
  fprime_line: anchorLine("_fprime", dfsphPy, "dfsph.py", "def _fprime(q: float) -> float:"),
  W_line: anchorLine("W", dfsphPy, "dfsph.py", "def W(q: float, h: float) -> float:"),
  grad_W_line: anchorLine("grad_W", dfsphPy, "dfsph.py", "def grad_W(r_vec: np.ndarray"),
  density_line: anchorLine("density", dfsphPy, "dfsph.py", "def density(\n"),
  density_evolution_line: anchorLine(
    "density_evolution",
    dfsphPy,
    "dfsph.py",
    "def density_evolution(\n",
  ),
  corrector_line: anchorLine(
    "divergence_free_solve",
    dfsphPy,
    "dfsph.py",
    "def divergence_free_solve(",
  ),
  canonical_params_line: anchorLine(
    "canonical_params",
    dfsphPy,
    "dfsph.py",
    "def canonical_params()",
  ),
  canonical_step_line: anchorLine("_canonical_step", simPy, "sim.py", "def _canonical_step("),
  canonical_h_line: anchorLine("CANONICAL_H", simPy, "sim.py", "CANONICAL_H: Final[float] ="),
};

// ---- 8. measured record (spec § 8.3 measured-then-declared) ------------------
// The spec's § MEASURED block is written by the step-2 harness run; until it
// exists the spine carries status "pending" and the PROVE card says so.
const specMd = read("packages/sph-water/web/verification-demo-spec.md");
let measured = { status: "pending", note: "step-2 harness measurement not yet recorded in spec" };
const mm = specMd.match(
  /MEASURED \(browser, ([^)]+)\): worst_ratio_of_budget=([0-9.e-]+); worst_abs position=([0-9.e-]+) velocity=([0-9.e-]+) density=([0-9.e-]+); run_twice=([a-z]+); kernel_f32_rel=([0-9.e-]+); norm_dev=([0-9.e-]+); corrector_f32_maxabs=([0-9.e-]+)/,
);
if (mm) {
  measured = {
    status: "recorded",
    provenance: mm[1],
    worst_ratio_of_budget: Number(mm[2]),
    worst_abs: { position: Number(mm[3]), velocity: Number(mm[4]), density: Number(mm[5]) },
    run_twice: mm[6] === "true",
    kernel_f32_rel: Number(mm[7]),
    norm_dev: Number(mm[8]),
    corrector_f32_maxabs: Number(mm[9]),
  };
}

// ---- 9. citation ledger (verified 2026-07-04, spec § 2.2) ---------------------
const citations = [
  { key: "BK15", ref: "Bender & Koschier 2015, SCA '15 — DFSPH (dual solver; eq. (5) continuity)", doi: "10.1145/2786784.2786796" },
  { key: "BK17", ref: "Bender & Koschier 2017, IEEE TVCG — DFSPH journal version (4.5+2.8 vs 50.5 iterations; 6.9x/13.4x/23.9x at dt=4ms)", doi: "10.1109/TVCG.2016.2578335" },
  { key: "Monaghan05", ref: "Monaghan 2005, Rep. Prog. Phys. 68(8) — cubic spline, SUPPORT-2h convention (repo golden table)", doi: "10.1088/0034-4885/68/8/R01" },
  { key: "Tutorial", ref: "Koschier, Bender, Solenthaler, Teschner — SPH tutorial (CFL lambda~0.4; XSPH eq. (103))", arxiv: "2009.06944" },
  { key: "Carensac22", ref: "Carensac, Pronost & Bouakaz 2022, Vis. Comput. — warm-start cyclic instability; Morton no GPU gain", doi: "10.1007/s00371-021-02379-w" },
  { key: "Hoetzlein14", ref: "Hoetzlein, GTC 2014 — counting-sort fixed-radius neighbors (15->4 kernels)", url: "https://ramakarl.com/pdfs/2014_Hoetzlein_FastFixedRadius_Neighbors.pdf" },
  { key: "Green10", ref: "Green, GDC 2010 — screen-space fluid rendering (bilateral recipe, normal reconstruction)", url: "https://developer.download.nvidia.com/presentations/2010/gdc/Direct3D_Effects.pdf" },
  { key: "TruongYuksel18", ref: "Truong & Yuksel 2018, PACMCGIT — narrow-range filter (cost ~ bilateral, better silhouettes)", doi: "10.1145/3203201" },
  { key: "vdLaan09", ref: "van der Laan, Green & Sainz 2009, I3D — SSFR with curvature flow (deferred; NRF ships instead)", doi: "10.1145/1507149.1507164" },
  { key: "GPUGems3-39", ref: "Harris, Sengupta & Owens — GPU Gems 3 ch. 39, work-efficient Blelloch scan", url: "https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-39-parallel-prefix-sum-scan-cuda" },
];

// ---- 10. links (existence-checked) --------------------------------------------
const links = {
  kernel_core: "packages/sph-water/src/sph_core.wgsl",
  kernel_live: "packages/sph-water/src/dfsph_solver.wgsl",
  reference: "packages/sph-water/sph_water/reference/dfsph.py",
  sim: "packages/sph-water/sph_water/sim.py",
  invariants: "packages/sph-water/sph_water/invariants.py",
  golden_kernel: kernelTablePath,
  golden_fixture: fixtureTablePath,
  tolerance_table: "tools/testkit/equivalence/tolerance.toml",
  gate_source: "tools/productization/web-deploy/verify.py",
  spec: "packages/sph-water/web/verification-demo-spec.md",
  capture_manifest: "captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json",
  extractor: "packages/sph-water/web/extract-gate-assets.py",
};
for (const rel of Object.values(links)) read(rel);

// ---- emit ----------------------------------------------------------------------
const out = {
  _generated_by:
    "packages/sph-water/web/gen-verification.mjs — do not edit; every value is extracted from committed sources and HARD-FAIL verified",
  sim: "sph-water",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  canonical: {
    descriptor: sidecar.descriptor,
    n_particles: canonicalN,
    step_count: canonicalSteps,
    capture_interval: canonicalInterval,
    checkpoints: sidecar.checkpoints,
    params_as_run: sidecar.params_as_run,
    manifest_h_note: sidecar.manifest_h_note,
    payload_sha256: sidecar.capture_payload_sha256,
    wall_clock_seconds: capManifest.run.wall_clock_seconds,
    reference_determinism: capManifest.determinism.claimed,
  },
  gate: {
    kind: "new_canonical",
    declared_rel: declared.relative,
    declared_abs: declared.absolute,
    thresholds: gateThresholds,
    criterion:
      "run-twice byte-identity + pointwise position/velocity/density vs the committed f64 capture on the ::" +
      gateThresholds.stride +
      " subsample (max_abs <= rel * max|field| per checkpoint) + golden-kernel/fixture/hash==brute/mirror/normalization artifacts",
    measured,
  },
  gate_assets: {
    ic: { path: "sph-gate-ic.bin", sha256: sidecar.ic_sha256, bytes: sidecar.ic_bytes, layout: sidecar.ic_layout },
    refs: { path: "sph-gate-refs.bin", sha256: sidecar.refs_sha256, bytes: sidecar.refs_bytes, layout: sidecar.ref_layout },
    subsample_stride: sidecar.subsample_stride,
    subsample_count: sidecar.subsample_count,
    fixtures_sha256: sha256(fixturesRaw),
  },
  golden: {
    kernel_table_sha256: sha256(kernelTableRaw),
    kernel_points: kernelTable.test_points.map((tp) => ({
      q: tp.inputs.q,
      h: tp.inputs.h,
      W: tp.expected.W,
      grad_W_magnitude: tp.expected.grad_W_magnitude,
    })),
    kernel_tolerance: kernelTable.tolerance,
    fixture_table_sha256: sha256(fixtureTableRaw),
    fixture_expected: fixtureTable.test_points[0].expected,
    fixture_tolerance: fixtureTable.tolerance,
  },
  determinism: {
    reference_claimed: capManifest.determinism.claimed,
    browser_claimed: "device-scoped bit-exact (same-device run-twice); cross-device distributional",
    two_tier_note:
      "the live DFSPH dual solver, walls, XSPH, and impulses are BEYOND the committed Phase-1 reference (labeled in-demo); the gate binds only to committed artifacts",
  },
  code_anchors: codeAnchors,
  py_anchors: pyAnchors,
  reference_params: refParams,
  citations,
  links,
};

mkdirSync(resolve(here, "src/generated"), { recursive: true });
writeFileSync(
  resolve(here, "src/generated/verification.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log("gen-verification: OK — src/generated/verification.json");
