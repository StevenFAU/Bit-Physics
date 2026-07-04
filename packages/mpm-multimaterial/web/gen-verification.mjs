#!/usr/bin/env node
// gen-verification.mjs — build-time data spine (prebuild/predev; Node builtins
// only). Extracts and HARD-FAIL-verifies every commitment the demo displays,
// so no constant is ever retyped by hand:
//   § 1 golden B-spline table binding (sha + samples + convention)
//   § 2 reference canonical params (regex-anchored from the Python source)
//   § 3 gate assets (public/ bins) SHA re-verification vs the sidecar
//   § 4 reference-computed fixtures cross-check vs the golden table
//   § 5 declared tolerance binding ([defaults.mpm] via tolerance.toml)
//   § 6 gate wiring + thresholds (extracted from web-deploy verify.py —
//       single source of truth for every T_MPM_* the page displays)
//   § 7 WGSL + NumPy code anchors (EXPLAIN layer; self-healing line ranges)
//   § 8 measured record (parsed from the spec's MEASURED block when present)
//   § 9 materials + presets AS DATA (INTERACT layer templates)
//   § 10 citations + reference-source ledger (existence-checked)
// Idempotent: byte-identical output on an unchanged tree
// (`node gen-verification.mjs && git diff --exit-code`).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const read = (p) => readFileSync(join(REPO, p), "utf8");
const readBytes = (p) => readFileSync(join(REPO, p));
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

function fail(msg) {
  console.error(`gen-verification: FAIL — ${msg}`);
  process.exit(1);
}

function matchOne(label, text, file, re) {
  const m = text.match(re);
  if (!m) fail(`anchor '${label}' not found in ${file}`);
  return m;
}

function anchorLine(label, text, file, needle) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.includes(needle));
  if (i < 0) fail(`anchor '${label}' ('${needle}') not found in ${file}`);
  return i + 1;
}

function anchorRange(label, text, file, startNeedle, endNeedle) {
  const start = anchorLine(label, text, file, startNeedle);
  const rest = text.split("\n").slice(start - 1);
  for (let i = 1; i < rest.length; i += 1) {
    if (rest[i].includes(endNeedle)) {
      return { file, start, end: start + i, text: rest.slice(0, i + 1).join("\n") };
    }
  }
  fail(`anchor '${label}' end ('${endNeedle}') not found in ${file}`);
  return null;
}

// --- § 1 golden table ---------------------------------------------------------
const GOLDEN_PATH = "tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json";
const goldenRaw = read(GOLDEN_PATH);
const golden = JSON.parse(goldenRaw);
const tp0 = golden.test_points[0];
if (!tp0.inputs.base_node_convention.includes("floor(p + 0.5) - 1")) {
  fail("golden base-node convention drifted");
}
if (golden.tolerance.absolute !== 1e-15) fail("golden tolerance drifted");
const xs = Object.keys(tp0.expected.samples).map((k) => Number(k.replace("x=", "")));
const nValues = Object.values(tp0.expected.samples);
const pouPs = Object.keys(tp0.expected.partition_of_unity).map((k) =>
  Number(k.replace("p=", "")),
);
if (xs.length !== 10 || pouPs.length !== 3) fail("golden table shape drifted");
if (xs.some((x) => !Number.isFinite(x))) fail("golden sample keys unparseable");

// --- § 2 reference canonical params --------------------------------------------
const REF_INIT = "packages/mpm-multimaterial/mpm_multimaterial/reference/__init__.py";
const refInit = read(REF_INIT);
const num = (label, re) => Number(matchOne(label, refInit, REF_INIT, re)[1]);
const refE = num("E", /CANONICAL_YOUNGS_MODULUS: Final\[float\] = ([0-9.e+]+)/);
const refNu = num("nu", /CANONICAL_POISSON_RATIO: Final\[float\] = ([0-9.]+)/);
const refDt = num("dt", /CANONICAL_DT: Final\[float\] = ([0-9.e-]+)/);
const refG = num("gravity", /CANONICAL_GRAVITY_Z: Final\[float\] = (-[0-9.]+)/);
const refRadius = num("radius", /CANONICAL_BLOB_RADIUS: Final\[float\] = ([0-9.]+)/);
const refVz = num("vz", /CANONICAL_BLOB_VELOCITY_Z: Final\[float\] = (-[0-9.]+)/);
const refFloor = num("floor", /CANONICAL_FLOOR_Z_INDEX: Final\[int\] = ([0-9]+)/);
if (refE !== 4000 || refNu !== 0.3 || refDt !== 1e-4) fail("canonical params drifted");
// Same-order f64 mirror of the reference Lame derivation.
const refMu = refE / (2.0 * (1.0 + refNu));
const refLam = (refE * refNu) / ((1.0 + refNu) * (1.0 - 2.0 * refNu));

// --- § 3 gate assets -----------------------------------------------------------
const sidecar = JSON.parse(read("packages/mpm-multimaterial/web/public/mpm-gate-refs.json"));
const icBytes = readBytes("packages/mpm-multimaterial/web/public/mpm-gate-ic.bin");
const refsBytes = readBytes("packages/mpm-multimaterial/web/public/mpm-gate-refs.bin");
if (sha256(icBytes) !== sidecar.ic_sha256) fail("mpm-gate-ic.bin SHA drift");
if (sha256(refsBytes) !== sidecar.refs_sha256) fail("mpm-gate-refs.bin SHA drift");
if (icBytes.length !== sidecar.ic_bytes || icBytes.length !== 5000 * 3 * 4) {
  fail("mpm-gate-ic.bin size mismatch");
}
if (
  refsBytes.length !== sidecar.refs_bytes ||
  refsBytes.length !== 6 * 5000 * 6 * 8
) {
  fail("mpm-gate-refs.bin size mismatch");
}
const capManifest = JSON.parse(
  read("captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.json"),
);
if (
  capManifest.payload.checksum !== `sha256:${sidecar.capture_payload_sha256}`
) {
  fail("sidecar capture payload SHA != committed manifest checksum");
}
if (Math.abs(sidecar.params_as_run.mu - refMu) > 1e-9) fail("sidecar mu drifted");
if (Math.abs(sidecar.params_as_run.lam - refLam) > 1e-9) fail("sidecar lam drifted");
if (sidecar.checkpoints.join(",") !== "0,10,20,30,40,50") fail("checkpoints drifted");

// --- § 4 fixtures ---------------------------------------------------------------
const FIX_PATH = "packages/mpm-multimaterial/web/fixtures/reference-fixtures.json";
const fixturesRaw = read(FIX_PATH);
const fixtures = JSON.parse(fixturesRaw);
const fb = fixtures.bspline;
if (fb.xs.join(",") !== xs.join(",")) fail("fixture xs != golden table xs");
fb.n_values.forEach((v, i) => {
  if (Math.abs(v - nValues[i]) > 1e-15) {
    fail(`fixture N(${fb.xs[i]}) deviates from golden table by > 1e-15`);
  }
});
fb.pou_sums.forEach((v) => {
  if (Math.abs(v - 1.0) > 1e-15) fail("fixture partition-of-unity != 1");
});
if (fixtures.neo_hookean_16.F.length !== 16) fail("neo fixture count drifted");
if (Math.abs(fixtures.neo_hookean_16.mu - refMu) > 1e-9) fail("fixture mu drifted");

// --- § 5 declared tolerance ------------------------------------------------------
const TOL_PATH = "tools/testkit/equivalence/tolerance.toml";
const tolToml = read(TOL_PATH);
const mpmSection = tolToml.match(/\[defaults\.mpm\]\s*\nrelative = ([0-9.e-]+)/);
if (!mpmSection) fail("[defaults.mpm] not found in tolerance.toml");
const defaultsMpmRel = Number(mpmSection[1]);
if (!tolToml.includes("[overrides.mpm-multimaterial]")) {
  fail("[overrides.mpm-multimaterial] cross-category row missing");
}

// --- § 6 gate wiring + thresholds -------------------------------------------------
const PIPELINE_PATH = "tools/productization/web-deploy/pipeline.py";
const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const pipelinePy = read(PIPELINE_PATH);
const verifyPy = read(VERIFY_PATH);
if (!pipelinePy.includes('"mpm-multimaterial": "new_canonical"')) {
  fail("GATE_KIND registration missing in pipeline.py");
}
if (!verifyPy.includes("def _gate_mpm_multimaterial")) {
  fail("_gate_mpm_multimaterial missing in verify.py");
}
if (!verifyPy.includes('"mpm-multimaterial": _gate_mpm_multimaterial')) {
  fail("_GATES dispatch entry missing in verify.py");
}
const thr = (label, re) => Number(matchOne(label, verifyPy, VERIFY_PATH, re)[1]);
const thresholds = {
  traj_rel: thr("traj", /T_MPM_TRAJ_REL = ([0-9.e-]+)/),
  golden_f64_abs: thr("g64", /T_MPM_GOLDEN_F64_ABS = ([0-9.e-]+)/),
  kernel_f32_rel: thr("k32", /T_MPM_KERNEL_F32_REL = ([0-9.e-]+)/),
  pou_f32_abs: thr("pou", /T_MPM_POU_F32_ABS = ([0-9.e-]+)/),
  neo_f64_abs: thr("n64", /T_MPM_NEO_F64_ABS = ([0-9.e-]+)/),
  neo_f32_rel: thr("n32", /T_MPM_NEO_F32_REL = ([0-9.e-]+)/),
  snow_sigma_slack: thr("snow", /T_MPM_SNOW_SIGMA_SLACK = ([0-9.e-]+)/),
  sand_logdet_abs: thr("sandv", /T_MPM_SAND_LOGDET_ABS = ([0-9.e-]+)/),
  sand_ortho_abs: thr("sando", /T_MPM_SAND_ORTHO_ABS = ([0-9.e-]+)/),
  headroom_factor: thr("head", /MPM_HEADROOM_FACTOR = ([0-9]+)/),
};
if (thresholds.traj_rel !== defaultsMpmRel) {
  fail("verify.py T_MPM_TRAJ_REL != tolerance.toml [defaults.mpm] relative");
}

// --- § 7 code anchors ---------------------------------------------------------------
const PRELUDE_PATH = "packages/mpm-multimaterial/src/mpm_prelude.wgsl";
const CORE_PATH = "packages/mpm-multimaterial/src/mpm_core.wgsl";
const MLS_PATH = "packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py";
const SHAPE_PATH =
  "packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py";
const prelude = read(PRELUDE_PATH);
const core = read(CORE_PATH);
const mlsPy = read(MLS_PATH);
const shapePy = read(SHAPE_PATH);
const anchors = {
  wgsl: {
    bspline_weights: anchorRange(
      "bspline_weights",
      prelude,
      PRELUDE_PATH,
      "fn bspline_weights(fp: f32) -> vec3f {",
      "}",
    ),
    bspline_n: anchorRange(
      "bspline_n",
      prelude,
      PRELUDE_PATH,
      "fn bspline_n(x: f32) -> f32 {",
      "return 0.0;",
    ),
    encode_fixed: anchorRange(
      "encode_fixed",
      prelude,
      PRELUDE_PATH,
      "fn encode_fixed(x: f32, scale: f32) -> i32 {",
      "}",
    ),
    neo_hookean: anchorRange(
      "neo_hookean",
      prelude,
      PRELUDE_PATH,
      "fn stress_neo_hookean(",
      "}",
    ),
    snow_stress: anchorRange(
      "snow_stress",
      prelude,
      PRELUDE_PATH,
      "fn stress_snow(",
      "}",
    ),
    sand_stress: anchorRange(
      "sand_stress",
      prelude,
      PRELUDE_PATH,
      "fn stress_sand(",
      "}",
    ),
    water_stress: anchorRange(
      "water_stress",
      prelude,
      PRELUDE_PATH,
      "fn stress_water(",
      "}",
    ),
    snow_return_map: anchorRange(
      "snow_return_map",
      prelude,
      PRELUDE_PATH,
      "fn snow_return_map(",
      "}",
    ),
    sand_return_map: anchorRange(
      "sand_return_map",
      prelude,
      PRELUDE_PATH,
      "fn sand_return_map(",
      "return s.u * diag3(exp(h)) * transpose(s.v);",
    ),
    p2g: anchorRange("p2g", core, CORE_PATH, "fn p2g(", "atomicAdd(&grid[cell].mz"),
    grid_update: anchorRange(
      "grid_update",
      core,
      CORE_PATH,
      "fn grid_update(",
      "grid_vel[idx] = vec4f(v, mass);",
    ),
    g2p: anchorRange("g2p", core, CORE_PATH, "fn g2p(", "particles[p] = pt;"),
  },
  python: {
    shape_n: anchorRange("N", shapePy, SHAPE_PATH, "def N(x: float) -> float:", "return 0.0"),
    p2g_with_stress: anchorRange(
      "p2g_with_stress",
      mlsPy,
      MLS_PATH,
      "def p2g_with_stress(",
      "stress_scale = -4.0 * dt * inv_dx_sq",
    ),
    g2p: anchorRange(
      "g2p_py",
      mlsPy,
      MLS_PATH,
      "def g2p(",
      "affine_scale = 4.0 / (grid_dx * grid_dx)",
    ),
    neo_hookean: anchorRange(
      "neo_py",
      mlsPy,
      MLS_PATH,
      "if j_det <= 0.0:",
      "s_iso = lam * log_j",
    ),
    grid_update: anchorRange(
      "grid_py",
      mlsPy,
      MLS_PATH,
      "def grid_update(",
      "if k <= floor_z:",
    ),
    advect: anchorRange(
      "advect_py",
      mlsPy,
      MLS_PATH,
      "def advect_particles(",
      "hi = (grid_n - 2) * grid_dx",
    ),
  },
};

// --- § 8 measured record --------------------------------------------------------------
const SPEC_PATH = "packages/mpm-multimaterial/web/verification-demo-spec.md";
const spec = read(SPEC_PATH);
let measured = { status: "pending" };
const mBlock = spec.match(/MEASURED \(browser[^\n]*\n```json\n([\s\S]*?)```/);
if (mBlock) {
  try {
    measured = { status: "recorded", ...JSON.parse(mBlock[1]) };
  } catch {
    fail("spec MEASURED block present but unparseable");
  }
}

// --- § 9 materials + presets AS DATA ---------------------------------------------------
const materials = [
  {
    name: "jelly",
    model: 0,
    E: 2.5e4,
    nu: 0.3,
    rho: 1200,
    color: [0.3, 0.85, 0.72, 0.6],
  },
  {
    name: "snow",
    model: 1,
    E: 5e4,
    nu: 0.2,
    rho: 400,
    thetaC: 2.5e-2,
    thetaS: 7.5e-3,
    xi: 10,
    color: [0.93, 0.96, 1.0, 0.12],
  },
  {
    name: "sand",
    model: 2,
    E: 3.5e5,
    nu: 0.3,
    rho: 1600,
    frictionDeg: 45,
    color: [0.82, 0.66, 0.38, 0.05],
  },
  {
    name: "water",
    model: 3,
    rho: 1000,
    kStiff: 8e3,
    gammaExp: 3,
    color: [0.22, 0.55, 0.95, 0.85],
  },
];

const presets = [
  {
    id: "showcase",
    label: "showcase",
    title: "four materials, one grid solve — sand bed, water pour, jelly drop, snowball",
    gridN: 64,
    floorZ: 4,
    frameAdvance: 0.004,
    budget: 55000,
    camera: { yaw: 0.85, pitch: 0.42, dist: 2.1 },
    blocks: [
      { shape: "box", material: "sand", min: [0.1, 0.1, 0.085], size: [0.8, 0.34, 0.09] },
      { shape: "box", material: "water", min: [0.12, 0.62, 0.085], size: [0.3, 0.26, 0.24] },
      { shape: "box", material: "jelly", min: [0.58, 0.58, 0.42], size: [0.2, 0.2, 0.2], vel: [0, 0, -1] },
      { shape: "sphere", material: "snow", center: [0.3, 0.32, 0.66], radius: 0.1, vel: [0.6, 0.5, -2.2] },
    ],
  },
  {
    id: "snowball",
    label: "snowball",
    title: "two snowballs collide over a snow bed — watch the SVD clamp pack them",
    gridN: 64,
    floorZ: 4,
    frameAdvance: 0.004,
    budget: 45000,
    camera: { yaw: 1.2, pitch: 0.3, dist: 2.0 },
    blocks: [
      { shape: "box", material: "snow", min: [0.15, 0.15, 0.085], size: [0.7, 0.7, 0.07] },
      { shape: "sphere", material: "snow", center: [0.24, 0.5, 0.5], radius: 0.09, vel: [3.0, 0, -0.4] },
      { shape: "sphere", material: "snow", center: [0.76, 0.5, 0.56], radius: 0.09, vel: [-3.0, 0, -0.4] },
    ],
  },
  {
    id: "sand-collapse",
    label: "sand collapse",
    title: "granular column collapse — the classic Drucker-Prager benchmark shape",
    gridN: 64,
    floorZ: 4,
    frameAdvance: 0.004,
    budget: 50000,
    camera: { yaw: 0.6, pitch: 0.35, dist: 2.05 },
    blocks: [
      { shape: "box", material: "sand", min: [0.34, 0.34, 0.085], size: [0.32, 0.32, 0.3] },
    ],
  },
  {
    id: "dam-break",
    label: "dam break",
    title: "water column release — weakly-compressible Tait EOS (J-only)",
    gridN: 64,
    floorZ: 4,
    frameAdvance: 0.005,
    budget: 60000,
    camera: { yaw: 0.9, pitch: 0.32, dist: 2.1 },
    blocks: [
      { shape: "box", material: "water", min: [0.08, 0.08, 0.085], size: [0.28, 0.84, 0.42] },
      { shape: "box", material: "jelly", min: [0.62, 0.42, 0.085], size: [0.16, 0.16, 0.16] },
    ],
  },
  {
    id: "jelly-stack",
    label: "jelly stack",
    title: "neo-Hookean tower drop — the verified constitutive core, wobbling",
    gridN: 64,
    floorZ: 4,
    frameAdvance: 0.004,
    budget: 40000,
    camera: { yaw: 0.75, pitch: 0.38, dist: 2.0 },
    blocks: [
      { shape: "box", material: "jelly", min: [0.4, 0.4, 0.1], size: [0.2, 0.2, 0.14] },
      { shape: "box", material: "jelly", min: [0.42, 0.42, 0.34], size: [0.16, 0.16, 0.14], vel: [0, 0, -0.5] },
      { shape: "box", material: "jelly", min: [0.44, 0.44, 0.58], size: [0.12, 0.12, 0.14], vel: [0, 0, -1.0] },
    ],
  },
  {
    id: "snow-globe",
    label: "snow globe",
    title: "mixed flurry — all four materials sprinkled, stir with the pointer",
    gridN: 64,
    floorZ: 4,
    frameAdvance: 0.004,
    budget: 40000,
    camera: { yaw: 1.0, pitch: 0.45, dist: 2.15 },
    blocks: [
      { shape: "sphere", material: "snow", center: [0.35, 0.35, 0.6], radius: 0.08, vel: [0.4, 0.7, -1] },
      { shape: "sphere", material: "jelly", center: [0.65, 0.35, 0.5], radius: 0.07, vel: [-0.6, 0.4, -1] },
      { shape: "sphere", material: "sand", center: [0.35, 0.65, 0.55], radius: 0.07, vel: [0.5, -0.5, -1] },
      { shape: "sphere", material: "water", center: [0.65, 0.65, 0.62], radius: 0.08, vel: [-0.4, -0.6, -1] },
    ],
  },
  {
    id: "canonical-drop",
    label: "canonical drop",
    title: "the gated scene: 16-cube neo-Hookean drop-impact (E=4000, seed-42 blob)",
    gridN: 16,
    floorZ: 4,
    frameAdvance: 0.002,
    budget: 5000,
    camera: { yaw: 0.8, pitch: 0.35, dist: 2.2 },
    blocks: [
      {
        shape: "sphere",
        material: "jelly",
        center: [0.5, 0.5, 0.65],
        radius: 0.15,
        vel: [0, 0, -2],
      },
    ],
  },
];

// --- § 10 citations + reference sources -------------------------------------------------
const referenceSources = [
  "packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py",
  "packages/mpm-multimaterial/mpm_multimaterial/reference/shape_functions.py",
  "packages/mpm-multimaterial/mpm_multimaterial/invariants.py",
  "packages/mpm-multimaterial/mpm_multimaterial/sim.py",
  "tools/testkit/golden/tables/hybrid-pg/mls-mpm-shape-functions.json",
  "tools/testkit/golden/derivations/mls-mpm-quadratic-bspline.md",
  "captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.json",
  "captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.json",
  "packages/mpm-multimaterial/web/verification-demo-spec.md",
];
for (const p of referenceSources) read(p); // existence check

const citations = [
  {
    key: "hu2018",
    text: "Hu, Fang, Ge, Qu, Zhu, Pradhana, Jiang (2018) — A Moving Least Squares Material Point Method — SIGGRAPH",
    doi: "10.1145/3197517.3201293",
  },
  {
    key: "jiang2016",
    text: "Jiang, Schroeder, Teran, Stomakhin, Selle (2016) — The Material Point Method for Simulating Continuum Materials — SIGGRAPH course",
    doi: "10.1145/2897826.2927348",
  },
  {
    key: "stomakhin2013",
    text: "Stomakhin, Schroeder, Chai, Teran, Selle (2013) — A Material Point Method for Snow Simulation — ACM TOG 32(4)",
    doi: "10.1145/2461912.2461948",
  },
  {
    key: "klar2016",
    text: "Klar, Gast, Pradhana, Fu, Schroeder, Jiang, Teran (2016) — Drucker-Prager Elastoplasticity for Sand Animation — ACM TOG 35(4)",
    doi: "10.1145/2897824.2925906",
  },
  {
    key: "tampubolon2017",
    text: "Tampubolon, Gast, Klar, Fu, Teran, Jiang, Museth (2017) — Multi-species simulation of porous sand and water mixtures — ACM TOG 36(4)",
    doi: "10.1145/3072959.3073651",
  },
  {
    key: "defour2015",
    text: "Defour, Collange (2015) — Reproducible floating-point atomic addition in data-parallel environment — FedCSIS (1000/1000 distinct f32-atomic results)",
    doi: "10.15439/2015F86",
  },
  {
    key: "lewin2024",
    text: "Lewin (2024) — A Position Based Material Point Method (PB-MPM) — SIGGRAPH talk; WGSL fixed-point-atomics engineering reference (BSD 3-Clause)",
    doi: "10.1145/3641233.3664323",
  },
  {
    key: "wang2020",
    text: "Wang, Qiu, Slattery, et al. (2020) — A massively parallel and scalable multi-GPU material point method (claymore; G2P2G fusion ~2x)",
    doi: "10.1145/3386569.3392442",
  },
];

// --- emit -------------------------------------------------------------------------------
const out = {
  _generated_by: "packages/mpm-multimaterial/web/gen-verification.mjs",
  golden: {
    path: GOLDEN_PATH,
    sha256: sha256(goldenRaw),
    tolerance_abs: golden.tolerance.absolute,
    base_node_convention: tp0.inputs.base_node_convention,
    formula: tp0.inputs.formula,
    xs,
    n_values: nValues,
    pou_ps: pouPs,
  },
  canonical: {
    descriptor: sidecar.descriptor,
    capture_manifest: "captures/mpm-multimaterial-stack-e/drop-impact-16cube-seed42-step50.json",
    capture_payload_sha256: sidecar.capture_payload_sha256,
    params_as_run: sidecar.params_as_run,
    checkpoints: sidecar.checkpoints,
    ic_sha256: sidecar.ic_sha256,
    refs_sha256: sidecar.refs_sha256,
    ic_bytes: sidecar.ic_bytes,
    refs_bytes: sidecar.refs_bytes,
    determinism_claimed: capManifest.determinism.claimed,
    ref_capture_1m: {
      manifest: "captures/mpm-multimaterial-stack-e/drop-impact-128cube-seed42-step500.json",
      n_particles: 1000000,
      note: "offline/CI-scale reference capture — displayed as provenance; the live gate replays the browser-tractable 16-cube diagnostic canonical (spec § 2.1)",
    },
  },
  fixtures_sha256: sha256(fixturesRaw),
  tolerance: {
    path: TOL_PATH,
    defaults_mpm_relative: defaultsMpmRel,
    resolution_note:
      "[overrides.mpm-multimaterial] resolves sim category hybrid-pg to tolerance category mpm (tolerance.toml — wiring, not a widening)",
  },
  gate: {
    kind: "new_canonical",
    registered_in_pipeline: true,
    gate_fn: "_gate_mpm_multimaterial",
    thresholds,
    reference: { E: refE, nu: refNu, dt: refDt, gravity_z: refG, blob_radius: refRadius, blob_vz: refVz, floor_z: refFloor, mu: refMu, lam: refLam },
  },
  anchors,
  measured,
  materials,
  presets,
  citations,
  reference_sources: referenceSources,
};

const json = `${JSON.stringify(out, null, 2)}\n`;
writeFileSync(join(HERE, "src/generated/verification.json"), json);
console.log(
  `gen-verification: OK — verification.json ${json.length} bytes; ` +
    `golden sha ${out.golden.sha256.slice(0, 12)}…, ic sha ${sidecar.ic_sha256.slice(0, 12)}…`,
);
