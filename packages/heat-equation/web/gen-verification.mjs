// gen-verification.mjs — per-sim verification data spine (spec-ref § 5.6).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card
// and live gate re-run cannot drift from the repository. The emitted file is
// committed; this script re-runs on prebuild/predev and must be idempotent.
//
// FAIL-HARD CONTRACT: any missing source file, pattern that does not match
// exactly once, unparsed tolerance/verify.py/pipeline.py value, golden-table
// value the pure-JS f64 recompute cannot reproduce, blackbody LUT stop that
// diverges from the golden table, or gate asset whose sha diverges from its
// extraction sidecar aborts non-zero. No silent fallbacks.
//
// Node builtins only + the sim's own heat64.mjs (pure JS, no deps).

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  continuousEigenvalue,
  decayTable,
  discreteEigenvalue,
  makeCanonicalIc,
  parsevalRelErr,
  sinsinAmplitude,
  spectralStep,
} from "./src/heat64.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

function fail(msg) {
  console.error(`gen-verification: FAIL — ${msg}`);
  process.exit(1);
}

function read(relPath) {
  try {
    return readFileSync(join(repoRoot, relPath), "utf8");
  } catch {
    fail(`missing source file: ${relPath}`);
  }
}

function readBytes(relPath) {
  try {
    return readFileSync(join(repoRoot, relPath));
  } catch {
    fail(`missing asset: ${relPath}`);
  }
}

function matchOne(label, text, sourcePath, re) {
  const m = text.match(re);
  if (!m) fail(`${sourcePath}: anchored pattern for "${label}" did not match (${re})`);
  return m;
}

// --- 1. tolerance.toml: [defaults.heat-equation] + [overrides.heat-equation]
const tolToml = read("tools/testkit/equivalence/tolerance.toml");
const tolRel = Number(
  matchOne(
    "defaults.heat-equation relative",
    tolToml,
    "tolerance.toml",
    /\[defaults\.heat-equation\]\nrelative = ([0-9eE+.-]+)/,
  )[1],
);
if (!(tolRel > 0)) fail("parsed [defaults.heat-equation] relative is not positive");
matchOne(
  "overrides.heat-equation",
  tolToml,
  "tolerance.toml",
  /\[overrides\.heat-equation\]\ncategory = "heat-equation"/,
);

// --- 2. pipeline.py GATE_KIND + verify.py thresholds -------------------------
const pipelinePy = read("tools/productization/web-deploy/pipeline.py");
matchOne("GATE_KIND entry", pipelinePy, "pipeline.py", /"heat-equation": "new_canonical"/);
const verifyPy = read("tools/productization/web-deploy/verify.py");
const trajRel = Number(
  matchOne("T_HEAT_TRAJ_REL", verifyPy, "verify.py", /T_HEAT_TRAJ_REL = ([0-9eE+.-]+)/)[1],
);
if (trajRel !== tolRel) {
  fail(`verify.py T_HEAT_TRAJ_REL (${trajRel}) != [defaults.heat-equation] relative (${tolRel})`);
}
const modeRel = Number(
  matchOne("T_HEAT_MODE_REL", verifyPy, "verify.py", /T_HEAT_MODE_REL = ([0-9eE+.-]+)/)[1],
);
if (!(modeRel > 0)) fail("parsed T_HEAT_MODE_REL is not positive");
matchOne("gate fn", verifyPy, "verify.py", /def _gate_heat_equation\(/);

// --- 3. golden tables: copy + independent pure-JS f64 recompute -------------
const tableC = JSON.parse(
  read("tools/testkit/golden/tables/volumetric-grid/heat-equation-laplacian-eigenvalues.json"),
);
const lapPoints = tableC.test_points.map((tp) => {
  const [m, k] = tp.inputs.mode;
  const lc = continuousEigenvalue(tp.inputs.n, m, k);
  const ld = discreteEigenvalue(tp.inputs.n, m, k);
  const relOk = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
  if (!relOk(lc, tp.expected.lambda_continuous) || !relOk(ld, tp.expected.lambda_discrete)) {
    fail(`golden C recompute mismatch at N=${tp.inputs.n} mode ${tp.inputs.mode}`);
  }
  return {
    n: tp.inputs.n,
    mode: tp.inputs.mode,
    lambda_continuous: tp.expected.lambda_continuous,
    lambda_discrete: tp.expected.lambda_discrete,
  };
});

const tableA = JSON.parse(
  read("tools/testkit/golden/tables/volumetric-grid/heat-equation-spectral-decay.json"),
);
const spectralDecayPoints = tableA.test_points.map((tp) => {
  const [m, k] = tp.inputs.mode;
  const js = Math.exp(tp.inputs.alpha * continuousEigenvalue(tp.inputs.n, m, k) * tp.inputs.dt);
  const want = tp.expected.decay_factor;
  if (Math.abs(js - want) > 1e-13 * Math.max(want, 1e-300)) {
    fail(`golden A recompute mismatch at mode ${tp.inputs.mode}: js ${js} vs table ${want}`);
  }
  return {
    n: tp.inputs.n,
    mode: tp.inputs.mode,
    alpha: tp.inputs.alpha,
    dt: tp.inputs.dt,
    decay_factor: want,
  };
});

const tableB = JSON.parse(
  read("tools/testkit/golden/tables/volumetric-grid/heat-equation-fourier-decay.json"),
);
for (const tp of tableB.test_points) {
  const [m, k] = tp.inputs.mode;
  const cont = Math.exp(
    tp.inputs.alpha * continuousEigenvalue(tp.inputs.n, m, k) * tp.inputs.steps * tp.inputs.dt,
  );
  const g = 1 + tp.inputs.alpha * tp.inputs.dt * discreteEigenvalue(tp.inputs.n, m, k);
  const disc = g ** tp.inputs.steps;
  const relOk = (a, b) => Math.abs(a - b) <= 1e-11 * Math.max(Math.abs(b), 1e-300);
  if (!relOk(cont, tp.expected.continuous_amplitude) || !relOk(disc, tp.expected.discrete_amplitude)) {
    fail(`golden B recompute mismatch at N=${tp.inputs.n} mode ${tp.inputs.mode}`);
  }
}

// --- 4. blackbody LUT: web copy must match the golden table stops EXACTLY ---
const bbGolden = JSON.parse(
  read("tools/testkit/golden/tables/volumetric-grid/blackbody-planck-locus.json"),
);
const bbWeb = JSON.parse(read("packages/heat-equation/web/src/generated/blackbody-lut.json"));
const goldenStops = bbGolden.test_points.map((tp) => tp.expected.rgb_linear);
if (JSON.stringify(bbWeb.rgb_linear) !== JSON.stringify(goldenStops)) {
  fail(
    "blackbody web LUT stops diverge from the golden table — re-run tools/testkit/golden/generator/blackbody_planck_locus.py --write",
  );
}
if (
  bbWeb.t_min_K !== bbGolden.stops.t_min_K ||
  bbWeb.t_max_K !== bbGolden.stops.t_max_K ||
  bbWeb.t_step_K !== bbGolden.stops.t_step_K
) {
  fail("blackbody web LUT stop grid diverges from the golden table");
}

// --- 5. live pure-JS f64 spine checks (HARD-FAIL) ----------------------------
{
  const n = 64;
  const alpha = 0.02;
  const dt = 10 / (n * n);
  const ic = makeCanonicalIc(n);
  const parseval = parsevalRelErr(ic, n);
  if (parseval > 1e-13) fail(`live f64 FFT Parseval err ${parseval} > 1e-13`);
  const dec = decayTable(n, alpha, dt);
  let t = ic;
  const steps = 8;
  for (let i = 0; i < steps; i++) t = spectralStep(t, n, dec);
  const amp = sinsinAmplitude(t, n, 1, 1);
  const want = 0.5 * Math.exp(alpha * continuousEigenvalue(n, 1, 1) * steps * dt);
  if (Math.abs(amp - want) > 1e-12 * Math.abs(want)) {
    fail(`live f64 spectral per-mode decay drift: ${amp} vs ${want}`);
  }
}

// --- 6. gate reference assets: sha vs sidecar --------------------------------
const sidecar = JSON.parse(
  read("packages/heat-equation/web/public/heat-gate-fourier128-step512.json"),
);
const binBytes = readBytes("packages/heat-equation/web/public/heat-gate-fourier128-step512.bin");
const binSha = createHash("sha256").update(binBytes).digest("hex");
if (binSha !== sidecar.sha256) {
  fail(`gate reference sha ${binSha} != sidecar ${sidecar.sha256} — re-run extract-gate-refs.py`);
}
const decayBytes = readBytes("packages/heat-equation/web/public/heat-gate-decay-f64.bin");
const decaySha = createHash("sha256").update(decayBytes).digest("hex");
if (decaySha !== sidecar.decay_sha256) {
  fail(`decay table sha ${decaySha} != sidecar ${sidecar.decay_sha256} — re-run extract-gate-refs.py`);
}
if (
  sidecar.params.n !== 128 ||
  sidecar.params.steps !== 512 ||
  sidecar.params.alpha !== 0.02 ||
  sidecar.params.capture_interval !== 128
) {
  fail("gate reference sidecar params drifted from the web-gate canonical");
}
// JS-exp vs committed numpy-f64 decay agreement (engine-drift visibility;
// tolerance-based, NOT byte — Math.exp is not required correctly-rounded)
{
  const committed = new Float64Array(
    decayBytes.buffer.slice(decayBytes.byteOffset, decayBytes.byteOffset + decayBytes.byteLength),
  );
  const js = decayTable(sidecar.params.n, sidecar.params.alpha, sidecar.params.dt);
  if (committed.length !== js.length) fail("decay table length mismatch");
  for (let i = 0; i < js.length; i++) {
    if (Math.abs(js[i] - committed[i]) > 1e-14 * Math.max(committed[i], 1e-300)) {
      fail(`decay table JS-exp drift at mode ${i}: ${js[i]} vs ${committed[i]}`);
    }
  }
}

// --- 7. WGSL anchors (EXPLAIN layer code links; exactly-once) -----------------
const wgsl = read("packages/heat-equation/web/src/heat_core.wgsl");
const fftCommon = read("common/common-web/src/fft-wgsl.ts");
const anchorIn = (label, text, sourceName, re) => {
  const matches = [...text.matchAll(re)];
  if (matches.length !== 1) {
    fail(`${sourceName} anchor "${label}" matched ${matches.length} times (want exactly 1)`);
  }
  return text.slice(0, matches[0].index).split("\n").length;
};
const anchors = {
  ftcs_step_line: anchorIn("ftcs stencil kernel", wgsl, "heat_core.wgsl", /fn ftcs_step\(/g),
  spectral_mul_line: anchorIn(
    "committed-table spectral multiply",
    wgsl,
    "heat_core.wgsl",
    /fn spectral_mul\(/g,
  ),
  fft_pass_line: anchorIn("Stockham fft pass", wgsl, "heat_core.wgsl", /fn fft_pass\(/g),
  // poly trig is the SHARED kernel (operator decision 5 executed): the
  // anchor now lives in common/common-web/src/fft-wgsl.ts
  common_fft_marker_line: anchorIn(
    "common FFT splice marker",
    wgsl,
    "heat_core.wgsl",
    /\/\/__COMMON_FFT__/g,
  ),
  poly_trig_line: anchorIn("poly trig kernel (shared)", fftCommon, "fft-wgsl.ts", /fn cs_p\(/g),
  poly_trig_file: "common/common-web/src/fft-wgsl.ts",
};

// --- 8. emit ------------------------------------------------------------------
const out = {
  generated_by: "gen-verification.mjs (fail-hard data spine; spec-ref § 5.6)",
  gate: {
    kind: "new_canonical",
    n: sidecar.params.n,
    alpha: sidecar.params.alpha,
    dt: sidecar.params.dt,
    steps: sidecar.params.steps,
    capture_interval: sidecar.params.capture_interval,
    descriptor: sidecar.params.descriptor,
    mode_rel_threshold: modeRel,
  },
  tolerance: {
    category: "heat-equation",
    relative: tolRel,
    measured_basis:
      "2026-07-08 f32/complex64 proxy worst 1.19e-5 of field peak x 4.05 family spread x ~2 margin (tolerance.toml [defaults.heat-equation])",
  },
  reference_bin: {
    file: sidecar.file,
    sha256: sidecar.sha256,
    layout: sidecar.layout,
    decay_file: sidecar.decay_file,
    decay_sha256: sidecar.decay_sha256,
    witness_sha256: sidecar.determinism_witness_sha256,
  },
  goldens: {
    laplacian_table:
      "tools/testkit/golden/tables/volumetric-grid/heat-equation-laplacian-eigenvalues.json",
    blackbody_table: "tools/testkit/golden/tables/volumetric-grid/blackbody-planck-locus.json",
    laplacian_points: lapPoints,
    spectral_decay_points: spectralDecayPoints,
    js_f64_recompute:
      "Parseval + per-mode spectral decay verified at build with the in-repo pure-JS radix-2 f64 FFT (N=64); goldens A/B/C recomputed; blackbody LUT byte-matched to golden F; HARD-FAIL on drift",
  },
  wgsl_anchors: anchors,
};

const outDir = join(here, "src", "generated");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "verification.json");
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`gen-verification: OK -> ${outPath}`);
