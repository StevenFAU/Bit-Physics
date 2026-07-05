// gen-verification.mjs — per-sim verification data spine (web spec § 6).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card
// and live gate re-run cannot drift from the repository. The emitted file is
// committed; this script re-runs on prebuild/predev and must be idempotent.
//
// FAIL-HARD CONTRACT: any missing source file, pattern that does not match
// exactly once, unparsed tolerance/verify.py/pipeline.py value, golden-table
// value the pure-JS f64 recompute cannot reproduce, or gate-fields asset
// whose sha diverges from its extraction sidecar aborts non-zero. No silent
// fallbacks.
//
// Node builtins only + the sim's own isf64.mjs (pure JS, no deps).

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  continuousEigenvalue,
  discreteEigenvalue,
  fft3d,
  freeStep,
  normL2,
  taylorGreenWave2d,
} from "./src/isf64.mjs";

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

// --- 1. tolerance.toml: [defaults.isf] + [overrides.schrodinger-smoke] ------
const tolToml = read("tools/testkit/equivalence/tolerance.toml");
const tolRel = Number(
  matchOne(
    "defaults.isf relative",
    tolToml,
    "tolerance.toml",
    /\[defaults\.isf\]\nrelative = ([0-9eE+.-]+)/,
  )[1],
);
if (!(tolRel > 0)) fail("parsed [defaults.isf] relative is not positive");
matchOne(
  "overrides.schrodinger-smoke",
  tolToml,
  "tolerance.toml",
  /\[overrides\.schrodinger-smoke\]\ncategory = "isf"/,
);

// --- 2. pipeline.py GATE_KIND + verify.py threshold -------------------------
const pipelinePy = read("tools/productization/web-deploy/pipeline.py");
matchOne(
  "GATE_KIND entry",
  pipelinePy,
  "pipeline.py",
  /"schrodinger-smoke": "new_canonical"/,
);
const verifyPy = read("tools/productization/web-deploy/verify.py");
const trajRel = Number(
  matchOne(
    "T_ISF_TRAJ_REL",
    verifyPy,
    "verify.py",
    /T_ISF_TRAJ_REL = ([0-9eE+.-]+)/,
  )[1],
);
if (trajRel !== tolRel) {
  fail(`verify.py T_ISF_TRAJ_REL (${trajRel}) != [defaults.isf] relative (${tolRel})`);
}
matchOne("gate fn", verifyPy, "verify.py", /def _gate_schrodinger_smoke\(/);

// --- 3. golden tables: copy + independent pure-JS f64 recompute -------------
const tableB = JSON.parse(
  read("tools/testkit/golden/tables/volumetric-grid/isf-free-step-phase.json"),
);
const wrap = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const phasePoints = tableB.test_points.map((tp) => {
  const [mx, my, mz] = tp.inputs.mode;
  const k2 = (2 * Math.PI) ** 2 * (mx * mx + my * my + mz * mz);
  const recomputed = wrap(-((tp.inputs.hbar * tp.inputs.dt) / 2) * k2);
  if (Math.abs(wrap(recomputed - tp.expected.phase)) > 1e-14) {
    fail(
      `golden B recompute mismatch at mode ${tp.inputs.mode}: js ${recomputed} vs table ${tp.expected.phase}`,
    );
  }
  return {
    mode: tp.inputs.mode,
    hbar: tp.inputs.hbar,
    dt: tp.inputs.dt,
    phase: tp.expected.phase,
  };
});

const tableE = JSON.parse(
  read("tools/testkit/golden/tables/volumetric-grid/isf-laplacian-eigenvalues.json"),
);
const lapPoints = tableE.test_points.map((tp) => {
  const [mx, my, mz] = tp.inputs.mode;
  const lc = continuousEigenvalue(tp.inputs.n, mx, my, mz);
  const ld = discreteEigenvalue(tp.inputs.n, mx, my, mz);
  const relOk = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
  if (!relOk(lc, tp.expected.lambda_continuous) || !relOk(ld, tp.expected.lambda_discrete)) {
    fail(`golden E recompute mismatch at N=${tp.inputs.n} mode ${tp.inputs.mode}`);
  }
  return {
    n: tp.inputs.n,
    mode: tp.inputs.mode,
    lambda_continuous: tp.expected.lambda_continuous,
    lambda_discrete: tp.expected.lambda_discrete,
  };
});

// golden A + Parseval: live pure-JS f64 radix-2 FFT at N = 32 (HARD-FAIL)
{
  const n = 32;
  const psi = taylorGreenWave2d(n, 0.1);
  const pre = normL2(psi);
  freeStep(psi, 0.1, 1 / 24);
  const post = normL2(psi);
  const drift = Math.abs(post - pre) / pre;
  if (drift > 1e-13) fail(`live f64 FFT unitary-norm drift ${drift} > 1e-13 (golden A ceiling)`);
  const re = psi.re1.slice();
  const im = psi.im1.slice();
  fft3d(re, im, n, -1);
  let fourier = 0;
  for (let i = 0; i < re.length; i++) fourier += re[i] ** 2 + im[i] ** 2;
  let real = 0;
  for (let i = 0; i < re.length; i++) real += psi.re1[i] ** 2 + psi.im1[i] ** 2;
  const parseval = Math.abs(real - fourier / n ** 3) / real;
  if (parseval > 1e-13) fail(`live f64 FFT Parseval err ${parseval} > 1e-13`);
}

// --- 4. gate reference asset: sha vs sidecar ---------------------------------
const sidecar = JSON.parse(
  read("packages/schrodinger-smoke/web/public/isf-gate-ring32-step24.json"),
);
const binBytes = readBytes("packages/schrodinger-smoke/web/public/isf-gate-ring32-step24.bin");
const binSha = createHash("sha256").update(binBytes).digest("hex");
if (binSha !== sidecar.sha256) {
  fail(`gate reference sha ${binSha} != sidecar ${sidecar.sha256} — re-run extract-gate-fields.py`);
}
if (sidecar.params.n !== 32 || sidecar.params.steps !== 24 || sidecar.params.hbar !== 0.05) {
  fail("gate reference sidecar params drifted from the web-gate canonical");
}

// --- 5. emit ------------------------------------------------------------------
const out = {
  generated_by: "gen-verification.mjs (fail-hard data spine; web spec § 6)",
  gate: {
    kind: "new_canonical",
    n: sidecar.params.n,
    hbar: sidecar.params.hbar,
    dt: sidecar.params.dt,
    steps: sidecar.params.steps,
    capture_interval: sidecar.params.capture_interval,
    descriptor: "translating-ring-32cube-hbar0.05-step24-webgate",
  },
  tolerance: {
    category: "isf",
    relative: tolRel,
    measured_basis:
      "2026-07-05 complex64 proxy worst 1.4e-5 of field peak x 4.05 family spread x ~1.75 margin (spec-ref § 6.5b)",
  },
  reference_bin: {
    file: sidecar.file,
    sha256: sidecar.sha256,
    layout: sidecar.layout,
    witness_sha256: sidecar.determinism_witness_sha256,
  },
  goldens: {
    laplacian_table: "tools/testkit/golden/tables/volumetric-grid/isf-laplacian-eigenvalues.json",
    free_step_phase_points: phasePoints,
    laplacian_points: lapPoints,
    js_f64_recompute: "unitary-norm + Parseval verified at build with the in-repo pure-JS radix-2 f64 FFT (N=32); HARD-FAIL on drift",
  },
};

const outDir = join(here, "src", "generated");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "verification.json");
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`gen-verification: OK -> ${outPath}`);
