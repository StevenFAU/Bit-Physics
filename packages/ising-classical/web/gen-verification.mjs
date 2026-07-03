// gen-verification.mjs — per-sim verification data spine (verification-demo-spec § 4).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card,
// live gate re-run, falsifiability probe and measured-vs-Yang figure cannot
// drift from the repository. The emitted file is committed; this script
// re-runs on prebuild/predev and must be idempotent (acceptance § 7:
// `node gen-verification.mjs && git diff --exit-code`).
//
// FAIL-HARD CONTRACT (spec § 4): any missing source file, WGSL anchor pattern
// that does not match exactly once, unparsed verify.py/tolerance/ledger value,
// or a recorded reference-ensemble that no longer reproduces the committed
// perf-ledger browser measurement aborts with a non-zero exit. No silent
// fallbacks.
//
// Node builtins only (Lorenz template, packages/strange-attractors/web/).

import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

// --- 1. Canonical capture manifest (params/checksum/determinism, verbatim) --

const MANIFEST_PATH = "captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json";
const manifest = JSON.parse(read(MANIFEST_PATH));
for (const [path, val] of [
  ["config.params", manifest.config?.params],
  ["config.seed", manifest.config?.seed],
  ["config.dims", manifest.config?.dims],
  ["run.step_count", manifest.run?.step_count],
  ["run.capture_interval", manifest.run?.capture_interval],
  ["payload.checksum", manifest.payload?.checksum],
  ["determinism.claimed", manifest.determinism?.claimed],
]) {
  if (val === undefined) fail(`${MANIFEST_PATH}: missing field ${path}`);
}
if (/^sha256:0+$/.test(manifest.payload.checksum) || manifest.payload.checksum.length < 71) {
  fail(`${MANIFEST_PATH}: payload checksum is not a real digest`);
}
if (manifest.determinism.claimed !== "bit-exact-same-hw") {
  fail(`${MANIFEST_PATH}: determinism.claimed is "${manifest.determinism.claimed}", expected "bit-exact-same-hw"`);
}

// --- 2. Gate threshold + mechanism (verify.py, anchored) --------------------

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
const zThreshold = Number(matchOne("T_ISING_Z", verifyPy, VERIFY_PATH, /^T_ISING_Z = ([0-9.]+)$/m)[1]);
const nSeeds = Number(
  matchOne("n_seeds default", verifyPy, VERIFY_PATH, /def _gate_ising\(bundles: list\[dict\], n_seeds: int = ([0-9]+)\)/)[1],
);
matchOne("gate kind", verifyPy, VERIFY_PATH, /sim="ising-classical",\s*\n\s*kind="observable",/);
// the spread convention the live re-run must reproduce exactly
if (!verifyPy.includes("spread = max(nEs, float(np.std(n_e)) / math.sqrt(1))")) {
  fail(`${VERIFY_PATH}: spread-convention line moved — update the live z computation before regenerating`);
}

// --- 3. Golden-observable tolerances (tolerance.toml, anchored) -------------

const TOL_PATH = "tools/testkit/equivalence/tolerance.toml";
const tolBlock = matchOne(
  "golden_tolerance.lattice-spin.ising-classical",
  read(TOL_PATH),
  TOL_PATH,
  /\[golden_tolerance\.lattice-spin\.ising-classical\]\s*\ncritical_temp_rel = ([0-9.e-]+)\s*\nmagnetization_rel = ([0-9.e-]+)/,
);
const criticalTempRel = Number(tolBlock[1]);
const magnetizationRel = Number(tolBlock[2]);
if (!Number.isFinite(criticalTempRel) || !Number.isFinite(magnetizationRel)) {
  fail(`${TOL_PATH}: unparsed golden tolerances`);
}

// --- 4. Perf-ledger rows: oracle, pypi roundtrip, browser measurement -------

const LEDGER_PATH = "docs/perf-ledger.md";
const ledger = read(LEDGER_PATH);
const isingRow = (stack, descriptor) =>
  matchOne(
    `ledger row ${stack}`,
    ledger,
    LEDGER_PATH,
    new RegExp(`^\\| ising-classical \\| ${stack} \\| ${descriptor} \\| ([0-9.]+) \\|.*$`, "m"),
  );
const refRow = isingRow("numpy-reference", "metropolis-128sq-T2\\.27-seed42-step10000");
const browserRow = isingRow("webgpu-headless-chromium", "metropolis-128sq-T2\\.27-seed42-step10000");
const pypiRow = isingRow("pypi-fresh-venv", "capture-roundtrip · metropolis-128sq-T2\\.27-seed42-step10000");
matchOne("pypi bit-exact statement", pypiRow[0], LEDGER_PATH, /max_abs=0\.0 max_rel=0\.0.*BIT-EXACT/);

// the recorded browser gate measurement (U+2212 minus signs in the ledger)
const browserMeasured = matchOne(
  "browser z measurement",
  browserRow[0],
  LEDGER_PATH,
  /browser energy_per_spin −([0-9]+(?:\.[0-9]+)?) vs NumPy 6-seed ensemble mean −([0-9]+(?:\.[0-9]+)?) → \*\*z=([0-9]+(?:\.[0-9]+)?)\*\* < ([0-9]+(?:\.[0-9]+)?)/,
);
const recordedBrowser = {
  energy_per_spin: -Number(browserMeasured[1]),
  ensemble_mean: -Number(browserMeasured[2]),
  z: Number(browserMeasured[3]),
};
if (Number(browserMeasured[4]) !== zThreshold) {
  fail(`${LEDGER_PATH}: browser row threshold ${browserMeasured[4]} != verify.py T_ISING_Z ${zThreshold}`);
}
const browserBackend = matchOne("browser backend", browserRow[0], LEDGER_PATH, /browser-WebGPU, ([^)]+)\)/)[1];
const browserDate = matchOne("browser row date", browserRow[0], LEDGER_PATH, /\| (\d{4}-\d{2}-\d{2}) \|/)[1];

// --- 5. Recorded reference-ensemble stats, cross-checked against the ledger -

const ENSEMBLE_PATH = "packages/ising-classical/web/reference-ensemble.json";
const ensemble = JSON.parse(read(ENSEMBLE_PATH));
if (!Array.isArray(ensemble.energies_per_spin) || ensemble.energies_per_spin.length !== nSeeds) {
  fail(`${ENSEMBLE_PATH}: expected ${nSeeds} recorded energies`);
}
for (const e of ensemble.energies_per_spin) {
  if (!(e >= -2 && e <= 2)) fail(`${ENSEMBLE_PATH}: energy_per_spin ${e} outside the exact [-2, 2] bound`);
}
if (
  ensemble.protocol.T !== manifest.config.params.T ||
  ensemble.protocol.J !== manifest.config.params.J ||
  ensemble.protocol.h !== manifest.config.params.h ||
  ensemble.protocol.sweeps !== manifest.run.step_count
) {
  fail(`${ENSEMBLE_PATH}: protocol drifted from the canonical manifest`);
}
// the recorded stats must reproduce the committed browser measurement:
// mean (ledger rounds to 3 dp) and z (ledger rounds to 2 dp, computed from
// the ledger's 4-dp browser energy)
if (Math.abs(ensemble.mean - recordedBrowser.ensemble_mean) > 5e-4) {
  fail(
    `${ENSEMBLE_PATH}: recorded mean ${ensemble.mean} does not reproduce the ledger ensemble mean ` +
      `${recordedBrowser.ensemble_mean} — the reference oracle drifted; regenerate the sidecar`,
  );
}
const zRecomputed = Math.abs(recordedBrowser.energy_per_spin - ensemble.mean) / ensemble.spread;
if (Math.abs(zRecomputed - recordedBrowser.z) > 0.02) {
  fail(
    `${ENSEMBLE_PATH}: z recomputed from recorded stats (${zRecomputed.toFixed(4)}) does not reproduce ` +
      `the ledger z=${recordedBrowser.z} — the reference oracle drifted; regenerate the sidecar`,
  );
}
const expectedSpread = Math.max(ensemble.sem, ensemble.std);
if (Math.abs(ensemble.spread - expectedSpread) > 1e-12) {
  fail(`${ENSEMBLE_PATH}: spread does not follow the verify.py:354 max(SEM, σ) convention`);
}

// --- 6. Closed-form anchors: golden tables + spec-ref statements ------------

const TC_TABLE_PATH = "tools/testkit/golden/tables/ising-classical-critical-temperature.json";
const M_TABLE_PATH = "tools/testkit/golden/tables/ising-classical-magnetization.json";
const tcTable = JSON.parse(read(TC_TABLE_PATH));
const mTable = JSON.parse(read(M_TABLE_PATH));
const Tc = tcTable.test_points?.[0]?.expected?.T_c;
if (!(typeof Tc === "number" && Tc > 2.269 && Tc < 2.2692)) {
  fail(`${TC_TABLE_PATH}: unexpected T_c ${Tc}`);
}
// bind the exact value, but verify it IS 2/ln(1+√2) — the table is committed
// data, the formula is the claim the panel renders
if (Math.abs(Tc - 2 / Math.log(1 + Math.SQRT2)) > 1e-12) {
  fail(`${TC_TABLE_PATH}: T_c ${Tc} != 2/ln(1+√2)`);
}
const yangPoints = (mTable.test_points ?? [])
  .map((tp) => ({ T: tp.inputs?.T, m: tp.expected?.m }))
  .filter((p) => typeof p.T === "number" && typeof p.m === "number");
if (yangPoints.length < 3) fail(`${M_TABLE_PATH}: expected >= 3 Yang test points`);
if (mTable.tolerance?.relative !== magnetizationRel) {
  fail(`${M_TABLE_PATH}: table tolerance ${mTable.tolerance?.relative} != tolerance.toml magnetization_rel ${magnetizationRel}`);
}

const SPEC_PATH = "docs/sim-specs/lattice-spin/ising-classical/spec-ref.md";
const specRef = read(SPEC_PATH);
for (const [label, needle] of [
  ["Onsager Tc", "T_c = 2 / ln(1 + √2) ≈ 2.2691853142"],
  ["Yang m(T)", "m(T) = (1 - sinh⁻⁴(2β))^(1/8)"],
  ["Kramers-Wannier duality", "sinh(2 β_c J) = 1"],
  ["Hamiltonian", "H(s) = -J · Σ_<ij> s_i s_j  -  h · Σ_i s_i"],
]) {
  if (!specRef.includes(needle)) fail(`${SPEC_PATH}: closed-form statement "${label}" moved (${needle})`);
}

// --- 7. WGSL code anchors (exact-substring, must match exactly once) --------

const WGSL_PATH = "packages/ising-classical/src/metropolis.wgsl";
const wgsl = read(WGSL_PATH);
const wgslLines = wgsl.split("\n");
function anchorLine(label, needle) {
  const hits = wgslLines
    .map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => text.includes(needle));
  if (hits.length !== 1) {
    fail(`${WGSL_PATH}: anchor "${label}" (${needle}) matched ${hits.length} lines (want 1)`);
  }
  return { line: hits[0].line, text: hits[0].text.trim() };
}
function anchorRange(label, startNeedle, endNeedle) {
  const a = anchorLine(`${label}(start)`, startNeedle);
  const b = anchorLine(`${label}(end)`, endNeedle);
  if (b.line <= a.line) fail(`${WGSL_PATH}: anchor range "${label}" inverted`);
  return {
    start: a.line,
    end: b.line,
    lines: wgslLines.slice(a.line - 1, b.line).map((l) => l.replace(/^  /, "")),
  };
}
anchorLine("no-atomics declaration", "an independent uniform draw — NO atomic operations, NO subgroup");
const codeAnchors = {
  checkerboard: anchorLine("checkerboard", "if (((gid.x + gid.y) & 1u) != params.color) { return; }"),
  neighbour_sum: anchorRange(
    "neighbour_sum",
    "let neighbour_sum = f32(",
    "+ spin_at(i, j - 1) + spin_at(i, j + 1));",
  ),
  delta_e: anchorLine("delta_e", "let delta_e = 2.0 * s * (params.J * neighbour_sum + params.h);"),
  accept: anchorRange("accept", "let accept_prob = exp(-delta_e / params.T);", "spins[idx] = -spins[idx];"),
  pcg: anchorRange("pcg", "fn pcg_hash(input: u32) -> u32 {", "return f32(h) * (1.0 / 4294967296.0);"),
  entry: anchorLine("entry", "@compute @workgroup_size(8, 8, 1)"),
};

// --- 8. IC asset (the committed seed-42 lattice the protocol replays) -------

const IC_REL = "packages/ising-classical/web/public/ising-ic-seed42.bin";
const icBytes = readBytes(IC_REL);
if (icBytes.length !== 128 * 128 * 4) {
  fail(`${IC_REL}: ${icBytes.length} bytes, want ${128 * 128 * 4}`);
}

// --- 9. Emit -----------------------------------------------------------------

const out = {
  _generated_by: "packages/ising-classical/web/gen-verification.mjs — do not edit by hand",
  sim: "ising-classical",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "observable",
    z_threshold: zThreshold,
    n_seeds: nSeeds,
    criterion: "z = |E_browser − μ_ref| / spread < z_threshold, spread = max(SEM, σ) over the NumPy ensemble",
    recorded_browser: {
      ...recordedBrowser,
      backend: browserBackend,
      date: browserDate,
    },
    run_twice: "byte-identical",
  },
  reference_ensemble: {
    n_seeds: nSeeds,
    seeds: ensemble.protocol.seeds,
    energies_per_spin: ensemble.energies_per_spin,
    mean: ensemble.mean,
    std: ensemble.std,
    sem: ensemble.sem,
    spread: ensemble.spread,
    spread_convention: ensemble.spread_convention,
    source: "ising_classical.reference.ising_numpy metropolis_sweep — the gate's own oracle",
    provenance: ensemble._provenance.command,
  },
  analytic: {
    Tc,
    Tc_formula: "2 / ln(1 + √2)",
    kramers_wannier: "sinh(2 β_c J) = 1 (1941 duality — the same T_c from self-duality)",
    yang_formula: "m(T) = (1 − sinh⁻⁴(2/T))^(1/8) for T < T_c; 0 above",
    yang_points: yangPoints,
    magnetization_rel: magnetizationRel,
    critical_temp_rel: criticalTempRel,
    golden_tables: { critical_temperature: TC_TABLE_PATH, magnetization: M_TABLE_PATH },
  },
  determinism: {
    claimed: manifest.determinism.claimed,
    run_twice: "byte-identical",
    field_note:
      "the in-shader PCG hash differs from the reference's PCG64 — microstates differ by design, statistics agree; that is why the gate is `observable`, not a field compare",
  },
  canonical: {
    descriptor: "metropolis-128sq-T2.27-seed42-step10000",
    seed: manifest.config.seed,
    grid: manifest.config.dims,
    sweeps: manifest.run.step_count,
    capture_interval: manifest.run.capture_interval,
    params: manifest.config.params,
    payload_sha256: manifest.payload.checksum,
    wall_clock_reference_s: Number(refRow[1]),
    wall_clock_browser_s: Number(browserRow[1]),
  },
  falsify: {
    wrong_T: 1.5,
    note: "falsifiability-probe protocol (spec § 3.3): the SAME gate criterion run at a deliberately wrong temperature — NOT a gate parameter; the ordered-phase energy sits far outside the reference ensemble",
  },
  surfaces: {
    numpy_reference_s: Number(refRow[1]),
    pypi_wheel: "bit-exact 0.0/0.0 (fresh-venv wheel re-emits the canonical capture)",
    pypi_wall_s: Number(pypiRow[1]),
    webgpu_headless_s: Number(browserRow[1]),
  },
  ic_asset: {
    asset: "ising-ic-seed42.bin",
    bytes: icBytes.length,
    sha256: createHash("sha256").update(icBytes).digest("hex"),
    provenance: "the committed seed-42 ±1 lattice the canonical protocol replays — shipped verbatim",
  },
  code_anchors: codeAnchors,
  links: {
    kernel: WGSL_PATH,
    spec: SPEC_PATH,
    derivation: "tools/testkit/golden/derivations/ising-onsager.md",
    golden_tc: TC_TABLE_PATH,
    golden_m: M_TABLE_PATH,
    capture_manifest: MANIFEST_PATH,
    gate_source: VERIFY_PATH,
    tolerance_table: TOL_PATH,
    perf_ledger: LEDGER_PATH,
    reference_ensemble: ENSEMBLE_PATH,
    resolution_audit: "docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md",
  },
};

// links must resolve at HEAD — a moved doc must break the build, not the card
for (const [k, rel] of Object.entries(out.links)) {
  try {
    readFileSync(join(repoRoot, rel));
  } catch {
    fail(`links.${k}: ${rel} does not resolve at HEAD`);
  }
}

const outDir = join(here, "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "verification.json"), JSON.stringify(out, null, 2) + "\n");
console.log("gen-verification: OK — src/generated/verification.json");
