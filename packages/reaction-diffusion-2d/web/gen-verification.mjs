// gen-verification.mjs — per-sim verification data spine (verification-demo-spec § 4).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card,
// post-mortem timeline and live gate re-run cannot drift from the repository.
// The emitted file is committed; this script re-runs on prebuild/predev and
// must be idempotent (acceptance § 7.5: `node gen-verification.mjs && git
// diff --exit-code`).
//
// FAIL-HARD CONTRACT (spec § 4): any missing source file, WGSL anchor pattern
// that does not match exactly once, unparsed tolerance/verify.py/audit/ledger
// value, or canonical-fields asset whose sha diverges from its extraction
// sidecar aborts with a non-zero exit. No silent fallbacks.
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

const MANIFEST_PATH = "captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json";
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

// --- 2. Declared gate tolerance (tolerance.toml, anchored over the block) ---

const TOL_PATH = "tools/testkit/equivalence/tolerance.toml";
const tolToml = read(TOL_PATH);
const tolBlock = matchOne(
  "defaults.reaction-diffusion",
  tolToml,
  TOL_PATH,
  /\[defaults\.reaction-diffusion\]\s*\nrelative = ([0-9.e-]+)\s*\nabsolute = ([0-9.e-]+)/,
);
const declared = { relative: Number(tolBlock[1]), absolute: Number(tolBlock[2]) };
if (!Number.isFinite(declared.relative) || !Number.isFinite(declared.absolute)) {
  fail(`${TOL_PATH}: unparsed tolerance numbers`);
}
// the override must still resolve rd2d to this category (resolution wiring)
matchOne(
  "overrides.reaction-diffusion-2d",
  tolToml,
  TOL_PATH,
  /\[overrides\.reaction-diffusion-2d\]\s*\ncategory = "reaction-diffusion"/,
);

// --- 3. Gate fn + dormant contingency thresholds (verify.py, anchored) ------

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
matchOne("gate fn", verifyPy, VERIFY_PATH, /def _gate_rd2d\(/);
matchOne("gate kind", verifyPy, VERIFY_PATH, /sim="reaction-diffusion-2d",\s*\n\s*kind="capture_roundtrip",/);
const contingency = {
  short_horizon_max_step: Number(
    matchOne("T_RD2D_SHORTHORIZON_MAXSTEP", verifyPy, VERIFY_PATH, /^T_RD2D_SHORTHORIZON_MAXSTEP = ([0-9]+)/m)[1],
  ),
  short_horizon_abs: Number(
    matchOne("T_RD2D_SHORTHORIZON_ABS", verifyPy, VERIFY_PATH, /^T_RD2D_SHORTHORIZON_ABS = ([0-9.e-]+)/m)[1],
  ),
  field_bound: Number(
    matchOne("T_RD2D_FIELD_BOUND", verifyPy, VERIFY_PATH, /^T_RD2D_FIELD_BOUND = ([0-9.e-]+)/m)[1],
  ),
};

// --- 4. The honesty arc: pre-fix ledger row + post-fix resolution audit -----

const LEDGER_PATH = "docs/perf-ledger.md";
const ledger = read(LEDGER_PATH);
const rd2dRow = (stack) =>
  matchOne(
    `ledger row ${stack}`,
    ledger,
    LEDGER_PATH,
    new RegExp(
      `^\\| reaction-diffusion-2d \\| ${stack} \\| gray-scott-lambda-128sq-seed42-step2000 \\| ([0-9.]+) \\|.*$`,
      "m",
    ),
  );
const refRow = rd2dRow("numpy-reference");
const browserRow = rd2dRow("webgpu-headless-chromium");
// the pre-fix divergence numbers, quoted from the retained historical row
const prefixEarly = matchOne(
  "pre-fix step-200 max_abs",
  browserRow[0],
  LEDGER_PATH,
  /step 200 max_abs ([0-9.e-]+)\)/,
);
const prefixLate = matchOne(
  "pre-fix step-2000 max_abs",
  browserRow[0],
  LEDGER_PATH,
  /diverges to max_abs \*\*([0-9.]+)\*\* by step 2000/,
);
matchOne("tolerance-unchanged statement", browserRow[0], LEDGER_PATH, /`tolerance\.toml` byte-unchanged/);

const CHARTER_AUDIT = "docs/_audits/phase-5/browser-divergence-charter-2026-06-09T12-49-00Z.md";
const RESOLUTION_AUDIT = "docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md";
const resolution = read(RESOLUTION_AUDIT);
read(CHARTER_AUDIT);
const postfixMaxAbs = Number(
  matchOne(
    "post-fix measured max_abs",
    resolution,
    RESOLUTION_AUDIT,
    /matches the f64 canonical at \*\*([0-9.eE+-]+) — bit-identical to wgpu-native\*\*/,
  )[1],
);
matchOne("run-twice 7/7", resolution, RESOLUTION_AUDIT, /ALL 7 run-twice BYTE-IDENTICAL/);
matchOne("root cause", resolution, RESOLUTION_AUDIT, /HARNESS RACE/);
if (!(postfixMaxAbs > 0 && postfixMaxAbs < declared.relative)) {
  fail(`${RESOLUTION_AUDIT}: post-fix max_abs ${postfixMaxAbs} does not clear declared rel ${declared.relative}`);
}

// --- 5. WGSL code anchors (exact-substring, must match exactly once) --------

const WGSL_PATH = "packages/reaction-diffusion-2d/src/gray_scott.wgsl";
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
const codeAnchors = {
  wrap: anchorRange("wrap", "fn wrap(i: i32, n: i32) -> i32 {", "return select(m, m + n, m < 0);"),
  laplacian: anchorRange(
    "laplacian",
    "let lap_u = (cell(i - 1, j, 0u) + cell(i + 1, j, 0u)",
    "- 4.0 * v) / (params.dx * params.dx);",
  ),
  reaction: anchorLine("reaction", "let uvv = u * v * v;"),
  feed: anchorLine("feed", "params.Du * lap_u - uvv + params.F * (1.0 - u);"),
  kill: anchorLine("kill", "params.Dv * lap_v + uvv - (params.F + params.k) * v;"),
  euler: anchorRange("euler", "state_out[idx + 0u] = u + params.dt * du;", "state_out[idx + 1u] = v + params.dt * dv;"),
};

// --- 6. Live-gate-re-run asset: re-hash against the extraction sidecar ------

const ASSET_REL = "packages/reaction-diffusion-2d/web/public/rd2d-canonical-step2000.bin";
const SIDECAR_REL = "packages/reaction-diffusion-2d/web/public/rd2d-canonical-step2000.json";
const sidecar = JSON.parse(read(SIDECAR_REL));
const assetBytes = readBytes(ASSET_REL);
const assetSha = createHash("sha256").update(assetBytes).digest("hex");
if (assetSha !== sidecar.sha256) {
  fail(`${ASSET_REL}: sha256 ${assetSha} != sidecar ${sidecar.sha256} — rerun extract-canonical-fields.py`);
}
if (assetBytes.length !== sidecar.bytes || assetBytes.length !== 128 * 128 * 2 * 8) {
  fail(`${ASSET_REL}: ${assetBytes.length} bytes, want ${128 * 128 * 2 * 8}`);
}
if (sidecar.source_payload_sha256 !== manifest.payload.checksum) {
  fail(`${SIDECAR_REL}: source payload sha diverged from the committed manifest — rerun the extractor`);
}
if (sidecar.step !== manifest.run.step_count) {
  fail(`${SIDECAR_REL}: extracted step ${sidecar.step} != canonical step_count ${manifest.run.step_count}`);
}

const IC_REL = "packages/reaction-diffusion-2d/web/public/rd2d-ic-seed42.bin";
const icBytes = readBytes(IC_REL);
if (icBytes.length !== 128 * 128 * 2 * 4) {
  fail(`${IC_REL}: ${icBytes.length} bytes, want ${128 * 128 * 2 * 4}`);
}

// --- 7. Emit -----------------------------------------------------------------

const out = {
  _generated_by: "packages/reaction-diffusion-2d/web/gen-verification.mjs — do not edit by hand",
  sim: "reaction-diffusion-2d",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "capture_roundtrip",
    declared,
    // criterion verbatim from equivalence.harness.compare_captures: per field,
    // max_abs_err <= absolute + relative * max|field|
    criterion: "max_abs_err <= absolute + relative * max|field|, per captured field",
    measured_max_abs: postfixMaxAbs,
    measured_equals_wgpu_native: true,
    run_twice: "byte-identical",
  },
  postmortem: {
    prefix_step200_max_abs: Number(prefixEarly[1]),
    prefix_step2000_max_abs: Number(prefixLate[1]),
    root_cause:
      "frontend harness race (capture/live-loop shared ping-pong state) — the cross-backend-f32 hypothesis was REFUTED by measurement",
    tolerance_widened: false,
    postfix_max_abs: postfixMaxAbs,
    contingency: {
      status: "opt-in, dormant, pending-lavapipe",
      bounds: "undeclared (measured-then-declared)",
      short_horizon_max_step: contingency.short_horizon_max_step,
      short_horizon_abs: contingency.short_horizon_abs,
      field_bound: contingency.field_bound,
    },
    audits: { charter: CHARTER_AUDIT, resolution: RESOLUTION_AUDIT },
    perf_ledger_prefix_row: LEDGER_PATH,
  },
  determinism: {
    reference_claimed: manifest.determinism.claimed,
    browser_claimed: "epsilon",
    run_twice: "byte-identical",
  },
  canonical: {
    descriptor: "gray-scott-lambda-128sq-seed42-step2000",
    seed: manifest.config.seed,
    grid: manifest.config.dims,
    step_count: manifest.run.step_count,
    capture_interval: manifest.run.capture_interval,
    params: manifest.config.params,
    payload_sha256: manifest.payload.checksum,
    wall_clock_reference_s: Number(refRow[1]),
    wall_clock_browser_s: Number(browserRow[1]),
  },
  canonical_final_fields: {
    asset: "rd2d-canonical-step2000.bin",
    sha256: assetSha,
    bytes: assetBytes.length,
    dtype: "<f8",
    layout: sidecar.layout,
    step: sidecar.step,
    extracted_from: sidecar.extracted_from,
  },
  ic_asset: {
    asset: "rd2d-ic-seed42.bin",
    bytes: icBytes.length,
    sha256: createHash("sha256").update(icBytes).digest("hex"),
    provenance: "numpy PCG64 uniform(-1e-3, 1e-3) seed-42 perturbation — not reproducible in-browser, shipped verbatim",
  },
  surfaces: {
    stacks: ["numpy-reference", "taichi-cpu", "vulkan-cpp", "webgpu-headless"],
    native_binary: "reaction-diffusion-2d-stack-c",
  },
  code_anchors: codeAnchors,
  links: {
    kernel: WGSL_PATH,
    spec: "docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md",
    algebraic: "docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md",
    determinism: "docs/sim-specs/continuous-ca/reaction-diffusion-2d/determinism.md",
    charter_audit: CHARTER_AUDIT,
    resolution_audit: RESOLUTION_AUDIT,
    perf_ledger: LEDGER_PATH,
    gate_source: VERIFY_PATH,
    tolerance_table: TOL_PATH,
    capture_manifest: MANIFEST_PATH,
  },
};

// cross-stack surface rows must exist in the ledger (the strip is evidence,
// not decoration) — numpy-reference/webgpu already matched above
for (const stack of ["taichi-cpu", "vulkan-cpp"]) rd2dRow(stack);
matchOne(
  "native binary row",
  ledger,
  LEDGER_PATH,
  /^\| reaction-diffusion-2d-stack-c \| binary-cmake-linux \|/m,
);

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
