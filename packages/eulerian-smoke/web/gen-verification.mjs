// gen-verification.mjs — per-sim verification data spine (verification-demo-spec § 5).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card,
// FP-edge post-mortem and live gate re-run cannot drift from the repository.
// The emitted file is committed; this script re-runs on prebuild/predev and
// must be idempotent (`node gen-verification.mjs && git diff --exit-code`).
//
// FAIL-HARD CONTRACT: any missing source file, WGSL/NumPy anchor pattern that
// does not match exactly once, unparsed tolerance/verify.py/spec value, or
// gate-fields asset whose sha diverges from its extraction sidecar aborts with
// a non-zero exit. No silent fallbacks.
//
// Node builtins only (rd2d template).

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

// --- 1. Frozen reference: canonical params (verbatim from canonical_params_2d)

const REF_PATH = "packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py";
const refPy = read(REF_PATH);
const nJacobi = Number(matchOne("_DEFAULT_N_JACOBI", refPy, REF_PATH, /^_DEFAULT_N_JACOBI: Final\[int\] = (\d+)/m)[1]);
const p2d = matchOne(
  "canonical_params_2d body",
  refPy,
  REF_PATH,
  /def canonical_params_2d[\s\S]*?"n": (\d+),\s*\n\s*"nu": ([0-9.]+),\s*\n\s*"rho": ([0-9.]+),\s*\n\s*"dx": 1\.0 \/ ([0-9.]+),\s*\n\s*"dt": ([0-9.]+),/,
);
const CANON_PARAMS = {
  nu: Number(p2d[2]),
  rho: Number(p2d[3]),
  dx: 1.0 / Number(p2d[4]),
  dt: Number(p2d[5]),
  n: Number(p2d[1]),
  n_jacobi: nJacobi,
};
if (CANON_PARAMS.n !== 128) fail(`${REF_PATH}: canonical n ${CANON_PARAMS.n} != 128`);

// --- 2. Declared gate tolerance ([defaults.smoke] via [overrides.eulerian-smoke])

const TOL_PATH = "tools/testkit/equivalence/tolerance.toml";
const tolToml = read(TOL_PATH);
const tolBlock = matchOne(
  "defaults.smoke",
  tolToml,
  TOL_PATH,
  /\[defaults\.smoke\]\s*\nrelative = ([0-9.e-]+)\s*\nabsolute = ([0-9.e-]+)/,
);
const declared = { relative: Number(tolBlock[1]), absolute: Number(tolBlock[2]) };
matchOne(
  "overrides.eulerian-smoke",
  tolToml,
  TOL_PATH,
  /\[overrides\.eulerian-smoke\]\s*\ncategory = "smoke"/,
);

// --- 3. Gate wiring: verify.py thresholds + both GATE_KIND registries --------

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
matchOne("gate fn", verifyPy, VERIFY_PATH, /def _gate_eulerian_smoke\(/);
matchOne("gate kind (verify)", verifyPy, VERIFY_PATH, /"eulerian-smoke": "new_canonical"/);
const T = {
  traj_rel: Number(matchOne("T_SMOKE_TRAJ_REL", verifyPy, VERIFY_PATH, /^T_SMOKE_TRAJ_REL = ([0-9.e-]+)/m)[1]),
  density_neg: Number(matchOne("T_SMOKE_DENSITY_NEG", verifyPy, VERIFY_PATH, /^T_SMOKE_DENSITY_NEG = ([0-9.e-]+)/m)[1]),
  ref_sanity: Number(matchOne("T_SMOKE_REF_SANITY", verifyPy, VERIFY_PATH, /^T_SMOKE_REF_SANITY = ([0-9.]+)/m)[1]),
};
if (T.traj_rel !== declared.relative) {
  fail(`verify.py T_SMOKE_TRAJ_REL ${T.traj_rel} != tolerance.toml [defaults.smoke] relative ${declared.relative}`);
}
const PIPELINE_PATH = "tools/productization/web-deploy/pipeline.py";
matchOne("gate kind (pipeline)", read(PIPELINE_PATH), PIPELINE_PATH, /"eulerian-smoke": "new_canonical"/);

// --- 4. The measurement record: the web spec's v0.3 change log ----------------

const SPEC_PATH = "packages/eulerian-smoke/web/verification-demo-spec.md";
const spec = read(SPEC_PATH);
const edge = matchOne(
  "fp-edge cell count",
  spec,
  SPEC_PATH,
  /\*\*(\d+)\*\* cells fire the fx = \*\*([0-9.]+)\*\* edge at the very first advection \*\*in f64\*\*/,
);
const spike = matchOne(
  "fp-edge spike",
  spec,
  SPEC_PATH,
  /max\|u\| reaches \*\*(\d+)\*\* by step \*\*(\d+)\*\*/,
);
const chaosAmp = matchOne(
  "chaos amplification",
  spec,
  SPEC_PATH,
  /amplifies ~\*\*([^*]+)\*\* within 100 steps/,
)[1];
const proxyRatio = Number(
  matchOne(
    "proxy measured ratio",
    spec,
    SPEC_PATH,
    /worst per-checkpoint per-field ratio \*\*([0-9.]+)\*\* of the rel=1e-4 budget \(NumPy-f32 proxy/,
  )[1],
);
// browser-measured line: "**pending**" until the validate run banks it
const browserLine = matchOne(
  "browser measured ratio",
  spec,
  SPEC_PATH,
  /Browser-measured \(headless Chromium[^)]*\):\*\* worst per-checkpoint ratio \*\*([0-9.a-z]+)\*\* of the rel=1e-4 budget; run-twice byte-identical \*\*([a-zA-Z]+)\*\*/,
);
const browserRatio = browserLine[1] === "pending" ? null : Number(browserLine[1]);
if (browserLine[1] !== "pending" && !(Number.isFinite(browserRatio) && browserRatio > 0)) {
  fail(`${SPEC_PATH}: unparsed browser-measured ratio "${browserLine[1]}"`);
}
const measured = browserRatio !== null
  ? {
      worst_ratio: browserRatio,
      run_twice: browserLine[2],
      provenance: `worst per-checkpoint per-field max_abs as a ratio of the rel budget, measured via the repo's headless-Chromium validate run (banked in the web spec § 11 v0.3); NumPy-f32 proxy measured ${proxyRatio}`,
    }
  : {
      worst_ratio: proxyRatio,
      run_twice: "pending",
      provenance: "NumPy-f32 proxy measurement (web spec § 11 v0.3); browser validate value pending",
    };

// --- 5. Quarantined committed canonical (post-mortem provenance) --------------

const QUAR_MANIFEST = "captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.json";
const quar = JSON.parse(read(QUAR_MANIFEST));
if (!quar.payload?.checksum || quar.payload.checksum.length < 71) {
  fail(`${QUAR_MANIFEST}: missing payload checksum`);
}

// --- 6. WGSL + NumPy code anchors (exact-substring, exactly once) --------------

const WGSL_PATH = "packages/eulerian-smoke/src/stable_fluids_2d.wgsl";
const wgsl = read(WGSL_PATH);
const wgslLines = wgsl.split("\n");
function anchorLine(sourcePath, lines, label, needle) {
  const hits = lines
    .map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => text.includes(needle));
  if (hits.length !== 1) {
    fail(`${sourcePath}: anchor "${label}" (${needle}) matched ${hits.length} lines (want 1)`);
  }
  return { line: hits[0].line, text: hits[0].text.trim() };
}
function anchorRange(label, startNeedle, endNeedle) {
  const a = anchorLine(WGSL_PATH, wgslLines, `${label}(start)`, startNeedle);
  const b = anchorLine(WGSL_PATH, wgslLines, `${label}(end)`, endNeedle);
  if (b.line <= a.line) fail(`${WGSL_PATH}: anchor range "${label}" inverted`);
  return {
    start: a.line,
    end: b.line,
    lines: wgslLines.slice(a.line - 1, b.line).map((l) => l.replace(/^  /, "")),
  };
}
const codeAnchors = {
  backtrace_guard: anchorRange(
    "backtrace_guard",
    "x = x - floor(x / n) * n;",
    "if (x >= n) { x = 0.0; }",
  ),
  maccormack: anchorRange(
    "maccormack",
    "let corr_back = bilinear_vel_aux(cb);",
    "var result = pred + 0.5 * (orig - corr_back);",
  ),
  diffusion: anchorRange(
    "diffusion",
    "let lap = (vel_in[idx_of(i - 1, j)] + vel_in[idx_of(i + 1, j)]",
    "vel_out[idx] = center + params.dt * params.nu * lap;",
  ),
  jacobi: anchorRange(
    "jacobi",
    "let rhs = params.c_rhs * scalar_aux[idx];",
    "- params.dx2 * rhs);",
  ),
  advect_density: anchorRange(
    "advect_density",
    "fn advect_density(@builtin(global_invocation_id) gid: vec3<u32>) {",
    "scalar_out[idx] = bilinear_scalar_in(c);",
  ),
};

const refLines = refPy.split("\n");
const SIM_PY_PATH = "packages/eulerian-smoke/eulerian_smoke/sim.py";
const INV_PATH = "packages/eulerian-smoke/eulerian_smoke/invariants.py";
const invLines = read(INV_PATH).split("\n");
const pyAnchors = {
  maccormack_line: anchorLine(REF_PATH, refLines, "maccormack def", "def maccormack_advect_2d(").line,
  mod_edge_line: anchorLine(REF_PATH, refLines, "mod edge note", "np.mod(-1e-17, 128.0) == 128.0").line,
  diffusion_line: anchorLine(REF_PATH, refLines, "diffusion", "u_adv = u_adv + dt * nu * _laplacian_5point_periodic(u_adv, inv_dx2)").line,
  jacobi_line: anchorLine(REF_PATH, refLines, "jacobi sweep", "p = 0.25 * (").line,
  density_advect_line: anchorLine(REF_PATH, refLines, "sl advect def", "def semi_lagrangian_advect_2d(").line,
  collocated_caveat_line: anchorLine(REF_PATH, refLines, "collocated caveat", "The composed operator ``∇·∇p`` is the").line,
  div_tol_line: anchorLine(INV_PATH, invLines, "_DIV_TOL", "_DIV_TOL: float = 1e-1").line,
};

// --- 7. Live-gate-re-run asset: re-hash against the extraction sidecar --------

const ASSET_REL = "packages/eulerian-smoke/web/public/smoke-gate-tg-step1000.bin";
const SIDECAR_REL = "packages/eulerian-smoke/web/public/smoke-gate-tg-step1000.json";
const sidecar = JSON.parse(read(SIDECAR_REL));
const assetBytes = readBytes(ASSET_REL);
const assetSha = createHash("sha256").update(assetBytes).digest("hex");
if (assetSha !== sidecar.sha256) {
  fail(`${ASSET_REL}: sha256 ${assetSha} != sidecar ${sidecar.sha256} — rerun extract-gate-fields.py`);
}
if (assetBytes.length !== sidecar.bytes || assetBytes.length !== 128 * 128 * 3 * 8) {
  fail(`${ASSET_REL}: ${assetBytes.length} bytes, want ${128 * 128 * 3 * 8}`);
}
for (const [k, v] of Object.entries(CANON_PARAMS)) {
  if (sidecar.params?.[k] !== v) {
    fail(`${SIDECAR_REL}: params.${k} ${sidecar.params?.[k]} != canonical ${v} — rerun the extractor`);
  }
}
if (sidecar.step !== 1000 || sidecar.fp_edge_sentinel?.held_for_all_steps !== true) {
  fail(`${SIDECAR_REL}: step/sentinel fields wrong — rerun the extractor`);
}

// --- 8. Emit -------------------------------------------------------------------

const out = {
  _generated_by: "packages/eulerian-smoke/web/gen-verification.mjs — do not edit by hand",
  sim: "eulerian-smoke",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "new_canonical",
    declared_rel: declared.relative,
    declared_abs: declared.absolute,
    criterion:
      "per checkpoint, per field (u, v, density): max_abs(browser_f32 − reference_f64) ≤ abs + rel · max|browser field|; reference recomputed LIVE from the frozen NumPy implementation",
    thresholds: T,
    measured,
  },
  determinism: {
    reference_claimed: "bit-exact-same-hw",
    browser_claimed: "epsilon",
    run_twice: "byte-identical",
  },
  canonical: {
    descriptor: "taylor-green-2d-128sq-seed42-step1000",
    seed: 42,
    grid: [CANON_PARAMS.n, CANON_PARAMS.n],
    step_count: 1000,
    capture_interval: 100,
    params: CANON_PARAMS,
  },
  gate_asset: {
    asset: "smoke-gate-tg-step1000.bin",
    sha256: assetSha,
    bytes: assetBytes.length,
    dtype: "<f8",
    layout: sidecar.layout,
    step: sidecar.step,
    generated_by: sidecar._generated_by,
  },
  postmortem: {
    quarantined_descriptor: "lid-driven-cavity-128sq-re100-seed42-step1000",
    quarantined_sha: quar.payload.checksum,
    edge_cells_step1: Number(edge[1]),
    edge_fraction_value: Number(edge[2]),
    spike_max_u: Number(spike[1]),
    spike_step: Number(spike[2]),
    ref_sanity_maxu: T.ref_sanity,
    chaos_amplification: chaosAmp,
  },
  code_anchors: codeAnchors,
  py_anchors: pyAnchors,
  links: {
    kernel: WGSL_PATH,
    reference: REF_PATH,
    sim_py: SIM_PY_PATH,
    invariants: INV_PATH,
    spec: SPEC_PATH,
    tolerance_table: TOL_PATH,
    gate_source: VERIFY_PATH,
    quarantined_manifest: QUAR_MANIFEST,
    extractor: "packages/eulerian-smoke/web/extract-gate-fields.py",
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
