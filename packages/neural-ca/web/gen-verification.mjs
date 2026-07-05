// gen-verification.mjs — per-sim verification data spine (verification-demo-spec § 4).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts / explain.ts / verify-panel.ts
// import statically. Values are copied verbatim — never retyped — so the
// in-browser verification card, EXPLAIN code links, the backend-conditional
// live gate re-run, and the honesty-arc post-mortem cannot drift from the
// repository. The emitted file is committed; this script re-runs on
// prebuild/predev and must be idempotent (acceptance § 7.6:
// `node gen-verification.mjs && git diff --exit-code`).
//
// FAIL-HARD CONTRACT (spec § 4): any missing source file, WGSL anchor pattern
// that does not match exactly once, unparsed value, or canonical-frames asset
// whose sha diverges from its extraction sidecar aborts with a non-zero exit.
// No silent fallbacks. Node builtins only (rd2d/Lorenz template).

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

const MANIFEST_PATH = "captures/neural-ca-ref/growing-emoji-64sq-seed42-step1000-wgsl.json";
const manifest = JSON.parse(read(MANIFEST_PATH));
for (const [path, val] of [
  ["config.seed", manifest.config?.seed],
  ["config.dims", manifest.config?.dims],
  ["config.params.channel_n", manifest.config?.params?.channel_n],
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
if (manifest.determinism.claimed !== "epsilon") {
  fail(`${MANIFEST_PATH}: determinism.claimed is "${manifest.determinism.claimed}", expected "epsilon" (§ 2.1 — correct, not a placeholder)`);
}

// --- 2. Gate fn + kind + observable-contingency thresholds (verify.py) ------

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
matchOne("gate fn", verifyPy, VERIFY_PATH, /def _gate_neural_ca\(/);
matchOne("observable gate fn", verifyPy, VERIFY_PATH, /def _gate_neural_ca_observable\(/);
matchOne("gate kind", verifyPy, VERIFY_PATH, /"neural-ca": "capture_roundtrip"/);
matchOne("full-sweep stack", verifyPy, VERIFY_PATH, /frames = _stack_field\(bundles\[0\], "rgba"\)/);
matchOne("bit-exact criterion", verifyPy, VERIFY_PATH, /bit_exact = max_abs == 0\.0/);
const contingency = {
  short_horizon_step: Number(matchOne("T_NCA_SHORTHORIZON_STEP", verifyPy, VERIFY_PATH, /^T_NCA_SHORTHORIZON_STEP = ([0-9]+)/m)[1]),
  short_horizon_abs: Number(matchOne("T_NCA_SHORTHORIZON_ABS", verifyPy, VERIFY_PATH, /^T_NCA_SHORTHORIZON_ABS = ([0-9.e-]+)/m)[1]),
  alpha_min_mass: Number(matchOne("T_NCA_ALPHA_MIN_MASS", verifyPy, VERIFY_PATH, /^T_NCA_ALPHA_MIN_MASS = ([0-9.e-]+)/m)[1]),
  declared_short_horizon_abs: Number(matchOne("declared short_horizon_abs", verifyPy, VERIFY_PATH, /"short_horizon_abs":\s*([0-9.e-]+),/)[1]),
};
// the CANON path must name THIS committed manifest (gate reads it)
matchOne("CANON neural-ca", verifyPy, VERIFY_PATH, new RegExp(`"neural-ca":\\s*"${MANIFEST_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));

// --- 3. Gate tolerance (tolerance.toml [defaults.continuous-ca], verbatim) --

const TOL_PATH = "tools/testkit/equivalence/tolerance.toml";
const tolToml = read(TOL_PATH);
const tolBlock = matchOne(
  "defaults.continuous-ca",
  tolToml,
  TOL_PATH,
  /\[defaults\.continuous-ca\]\s*\nrelative = ([0-9.e-]+)\s*\nabsolute = ([0-9.e-]+)/,
);
const declared = { relative: Number(tolBlock[1]), absolute: Number(tolBlock[2]) };
if (declared.relative !== 0 || declared.absolute !== 0) {
  fail(`${TOL_PATH}: [defaults.continuous-ca] is ${declared.relative}/${declared.absolute}, expected 0/0 (bit-exact)`);
}

// --- 4. Cross-stack render-similarity gate — CURRENT (post-A6) + history ----
//
// The current committed floors + the A6-fix measured means live in
// tolerance.toml (the matched-PCG fix lifted D↔B from 23.92 dB to 144.562 dB —
// the earlier number was the torch.rand≠WGSL-PCG fire-mask bug, since fixed).
// Anchor BOTH the current floors and the two measured tuples from the same
// source, so the demo's cross-stack story cannot drift from the gate config.

const rsBlock = matchOne(
  "render_similarity floors",
  tolToml,
  TOL_PATH,
  /\[render_similarity\.continuous-ca\.neural-ca\]\s*\npsnr_min = ([0-9.]+)\s*\nssim_min = ([0-9.]+)\s*\nlpips_max = ([0-9.]+)/,
);
const rsCurrent = matchOne(
  "post-A6 measured render-similarity",
  tolToml,
  TOL_PATH,
  /now MEASURES mean PSNR ([0-9.]+), SSIM ([0-9.]+), LPIPS_alex ([0-9.]+)/,
);
const rsHistory = matchOne(
  "pre-A6 render-similarity history",
  tolToml,
  TOL_PATH,
  /MEASURED mean PSNR ([0-9.]+) < 28, SSIM[\s#]*([0-9.]+) < 0\.85; LPIPS_alex ([0-9.]+)/,
);
const efect = Number(
  matchOne(
    "training EFECT 3sigma",
    tolToml,
    TOL_PATH,
    /\[golden_tolerance\.continuous-ca\.neural-ca-python\][\s\S]*?training_loss_3sigma_upper = ([0-9.]+)/,
  )[1],
);

// --- 5. Determinism registry rows (registry.toml) ---------------------------

const REGISTRY_PATH = "tools/testkit/determinism/registry.toml";
const registry = read(REGISTRY_PATH);
const inferenceClass = matchOne(
  "inference determinism row",
  registry,
  REGISTRY_PATH,
  /\[continuous-ca\.neural-ca\.inference\][\s\S]*?class = "([a-z-]+)"[\s\S]*?scope = "([a-z-]+)"/,
);
const trainingClass = matchOne(
  "training determinism row",
  registry,
  REGISTRY_PATH,
  /\[continuous-ca\.neural-ca\.training\][\s\S]*?class = "([a-z-]+)"/,
);

// --- 6. WGSL code anchors (exact-substring, must match exactly once) --------

const WGSL_PATH = "packages/neural-ca/typescript/src/nca_inference.wgsl";
const wgsl = read(WGSL_PATH);
const wgslLines = wgsl.split("\n");
function anchorLine(label, needle) {
  const hits = wgslLines
    .map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => text.includes(needle));
  if (hits.length !== 1) fail(`${WGSL_PATH}: anchor "${label}" (${needle}) matched ${hits.length} lines (want 1)`);
  return { line: hits[0].line, text: hits[0].text.trim() };
}
function anchorRange(label, startNeedle, endNeedle) {
  const a = anchorLine(`${label}(start)`, startNeedle);
  const b = anchorLine(`${label}(end)`, endNeedle);
  if (b.line <= a.line) fail(`${WGSL_PATH}: anchor range "${label}" inverted`);
  return { start: a.line, end: b.line, lines: wgslLines.slice(a.line - 1, b.line).map((l) => l.replace(/^  /, "")) };
}
const codeAnchors = {
  perception: anchorRange("perception", "var perc : array<f32, 48>;", "perc[3u * c + 2u] = sy;"),
  mlp: anchorRange("mlp", "var dx : array<f32, 16>;", "dx[c] = dx[c] + weights[P.w2_off + c * HID + o] * h;"),
  pcg_fire: anchorRange("pcg_fire", "fn pcg_fire(x : u32, y : u32, step : u32, seed : u32) -> f32 {", "return f32(word) / 4294967296.0;"),
  fire_apply: anchorLine("fire_apply", "state_out[base + c] = state_in[base + c] + dx[c] * fire;"),
  alive: anchorRange("alive", "fn alive(buf_sel : u32, x : i32, y : i32) -> bool {", "return m > 0.1;"),
  alive_apply: anchorLine("alive_apply", "state_out[base + c] = state_mid[base + c] * keep;"),
};

// --- 7. The honesty arc: pre-fix ledger rows + post-fix resolution audit -----

const LEDGER_PATH = "docs/perf-ledger.md";
const ledger = read(LEDGER_PATH);
// pre-fix browser-vs-canonical divergence (row 86, retained unedited)
const prefixBrowser = matchOne("pre-fix browser max_abs", ledger, LEDGER_PATH, /max_abs ~([0-9.]+)[^0-9]+([0-9.]+), run-to-run/);
// Persistent regime facts (row 49) + NumPy oracle (row 50) + pypi re-emit (row 71)
const holdStep = Number(matchOne("persistent hold step", ledger, LEDGER_PATH, /the Persistent variant holds the pattern to step ([0-9]+)/)[1]);
const overgrowStep = Number(matchOne("growing overgrow step", ledger, LEDGER_PATH, /Growing variant overgrows by ~step ([0-9]+)/)[1]);
const numpyOracle = Number(matchOne("numpy oracle max_abs", ledger, LEDGER_PATH, /NumPy oracle reproduces this GPU capture to ([0-9.e-]+)/)[1]);
const pypiFields = Number(matchOne("pypi re-emit fields", ledger, LEDGER_PATH, /^\| neural-ca \| pypi-fresh-venv .*max_rel=0\.0, ([0-9]+) fields BIT-EXACT/m)[1]);

const CHARTER_AUDIT = "docs/_audits/phase-5/browser-divergence-charter-2026-06-09T12-49-00Z.md";
const RESOLUTION_AUDIT = "docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md";
const resolution = read(RESOLUTION_AUDIT);
read(CHARTER_AUDIT);
matchOne("root cause HARNESS RACE", resolution, RESOLUTION_AUDIT, /HARNESS RACE/);
matchOne("post-fix bit-exact 0.0", resolution, RESOLUTION_AUDIT, /capture_roundtrip \*\*bit-exact 0\.0\*\*/);
matchOne("shared RADV cause", resolution, RESOLUTION_AUDIT, /bit-exactness leaned on shared RADV/);
const prefixDawn = matchOne(
  "pre-fix within-Dawn step-100",
  resolution,
  RESOLUTION_AUDIT,
  /neural-ca\*\* \| DIFFERS from step 100 \(~([0-9.]+)[^0-9]+([0-9.]+)\)/,
);

// --- 8. Committed frames asset: re-hash against the extraction sidecar ------

const N_FRAMES = 21;
const GRID = manifest.config.dims[0];
const RGBA = 4;
const ASSET_REL = "packages/neural-ca/web/public/neural-ca-canonical-frames.bin";
const SIDECAR_REL = "packages/neural-ca/web/public/neural-ca-canonical-frames.json";
const sidecar = JSON.parse(read(SIDECAR_REL));
const assetBytes = readBytes(ASSET_REL);
const assetSha = createHash("sha256").update(assetBytes).digest("hex");
const expectedBytes = N_FRAMES * GRID * GRID * RGBA * 4;
if (assetSha !== sidecar.sha256) fail(`${ASSET_REL}: sha256 ${assetSha} != sidecar ${sidecar.sha256} — rerun extract-canonical-frames.py`);
if (assetBytes.length !== sidecar.bytes || assetBytes.length !== expectedBytes) fail(`${ASSET_REL}: ${assetBytes.length} bytes, want ${expectedBytes}`);
if (sidecar.source_payload_sha256 !== manifest.payload.checksum) fail(`${SIDECAR_REL}: source payload sha diverged from the committed manifest — rerun the extractor`);
if (sidecar.n_frames !== N_FRAMES) fail(`${SIDECAR_REL}: n_frames ${sidecar.n_frames} != ${N_FRAMES}`);

// --- 9. Weights provenance: shipped == golden Persistent-disk checkpoint -----
//
// Binds the "regime CONFIRMED Persistent / disk-target" claim (§ 2.1) to bytes.
const WEIGHTS_REL = "packages/neural-ca/web/public/nca-weights.bin";
const GOLDEN_REL = "tools/testkit/golden/checkpoints/neural-ca-emoji-disk-wgsl.bin";
const weightsSha = createHash("sha256").update(readBytes(WEIGHTS_REL)).digest("hex");
const goldenSha = createHash("sha256").update(readBytes(GOLDEN_REL)).digest("hex");
if (weightsSha !== goldenSha) {
  fail(`${WEIGHTS_REL}: sha ${weightsSha} != golden ${GOLDEN_REL} ${goldenSha} — shipped weights are NOT the Persistent-disk checkpoint`);
}

// --- 10. Emit ----------------------------------------------------------------

const out = {
  _generated_by: "packages/neural-ca/web/gen-verification.mjs — do not edit by hand",
  sim: "neural-ca",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "capture_roundtrip",
    declared,
    criterion: "max_abs == 0.0 (bit-exact) vs the WGSL canonical, field rgba, all frames",
    tolerance: "[defaults.continuous-ca] 0.0 / 0.0 (bit-exact, no row added)",
    measured_max_abs_radv: 0.0,
    measured_equals_wgpu_native: true,
    run_twice: "byte-identical",
    n_frames: N_FRAMES,
    backend_conditional: true,
    known_bitexact_family: "RADV / Vulkan (SPIR-V) — RX 6800 XT",
  },
  determinism: {
    within_wgsl: `${inferenceClass[1]} (${inferenceClass[2]})`,
    manifest_claimed: manifest.determinism.claimed,
    cross_stack: "statistical (render-similarity)",
    training: trainingClass[1],
    training_efect_3sigma_upper: efect,
    inference: `${inferenceClass[1]} (${inferenceClass[2]})`,
    run_twice: "byte-identical",
  },
  cross_stack: {
    // CURRENT — post-A6 matched-PCG fire mask (tolerance.toml § render_similarity)
    psnr: Number(rsCurrent[1]),
    ssim: Number(rsCurrent[2]),
    lpips_alex: Number(rsCurrent[3]),
    psnr_min: Number(rsBlock[1]),
    ssim_min: Number(rsBlock[2]),
    lpips_max: Number(rsBlock[3]),
    // pre-A6 history — the torch.rand≠WGSL-PCG fire-mask bug, since fixed
    history_psnr: Number(rsHistory[1]),
    history_ssim: Number(rsHistory[2]),
    history_lpips: Number(rsHistory[3]),
    why_statistical:
      "residual ~144 dB (not ∞) is the GPU-vs-CPU f32 conv-reduction order; the earlier 23.92 dB was the torch.rand≠WGSL-PCG fire-mask divergence, fixed at Phase-4 A6 by drawing the matched stateless PCG in PyTorch too",
    numpy_oracle_max_abs: numpyOracle,
  },
  model: {
    grid: [GRID, GRID],
    channels: manifest.config.params.channel_n,
    hidden: manifest.config.params.channel_n - RGBA,
    perception: "identity + Sobel-x + Sobel-y (48-vec)",
    mlp: "48 → 128 → 16 (final zero-init = residual)",
    fire_rate: 0.5,
    alive_threshold: 0.1,
    regime: "persistent",
    target: "disk",
    checkpoint: "neural-ca-emoji-disk",
    weights_sha256: weightsSha,
    weights_matches_golden: true,
  },
  canonical: {
    descriptor: "growing-emoji-64sq-seed42-step1000-wgsl",
    seed: manifest.config.seed,
    grid: manifest.config.dims,
    step_count: manifest.run.step_count,
    capture_interval: manifest.run.capture_interval,
    payload_sha256: manifest.payload.checksum,
    payload_sha256_is: "the HDF5 payload FILE hash — NOT the rgba-frame digest",
    persistent_hold_step: holdStep,
    growing_overgrow_step: overgrowStep,
  },
  canonical_frames: {
    asset: sidecar.asset,
    sha256: assetSha,
    bytes: assetBytes.length,
    dtype: "<f4",
    n_frames: sidecar.n_frames,
    steps: sidecar.steps,
    layout: sidecar.layout,
    extracted_from: sidecar.extracted_from,
  },
  postmortem: {
    prefix_browser_vs_canonical: `${prefixBrowser[1]}–${prefixBrowser[2]}`,
    prefix_within_dawn_step100: `${prefixDawn[1]}–${prefixDawn[2]}`,
    root_cause: "frontend capture/live-RAF harness race (shared ping-pong state) — the cross-backend-f32 hypothesis was REFUTED by measurement",
    tolerance_widened: false,
    postfix_max_abs_radv: 0.0,
    residual_axis: "bit-exactness is backend-conditional — confirmed on RADV-family backends only; the _gate_neural_ca_observable contingency is authored + declared and opt-in via BITPHYSICS_BROWSER_OBSERVABLE_FALLBACK",
    contingency: {
      short_horizon_step: contingency.short_horizon_step,
      short_horizon_abs: contingency.short_horizon_abs,
      alpha_min_mass: contingency.alpha_min_mass,
      declared_short_horizon_abs: contingency.declared_short_horizon_abs,
      status: "opt-in, pending-lavapipe",
    },
    audits: { charter: CHARTER_AUDIT, resolution: RESOLUTION_AUDIT },
    perf_ledger: LEDGER_PATH,
  },
  pypi_reemit: { max_abs: 0.0, n_fields: pypiFields },
  templates: [
    { id: "grow-from-seed", caption: "one live centre cell → a stable disk; the residual MLP does nothing until the fire mask lets it.", source: "Mordvintsev et al., Distill 2020" },
    { id: "persistent-hold", caption: `the Persistent regime's defining property: holds the pattern to step ${holdStep}. A Growing checkpoint would overgrow by ~step ${overgrowStep}.`, source: "perf-ledger.md — pool-trained checkpoint" },
    { id: "damage-measure", caption: "erase a disk of cells → watch the α-mass recover. Persistent ≠ damage-trained Regenerating: expect PARTIAL recovery, measured live.", source: "Distill 2020 — “some regenerative properties… but not full re-growth”" },
    { id: "multi-seed", caption: "drop several seeds → interacting organisms competing for the grid.", source: "Distill 2020 — seed placement" },
    { id: "fire-rate-sweep", caption: "vary the Bernoulli fire rate → the learned update is robust to asynchrony (live only; the gate re-runs pinned at 0.5).", source: "Distill 2020 — stochastic update" },
    { id: "hidden-channel-tour", caption: "false-color the 12 invisible hidden channels — the CA's “chemical” signals driving growth.", source: "spec-ref.md § 3 — unbounded hidden state" },
    { id: "backend-divergence-probe", caption: "re-run the canonical rollout on YOUR GPU and score all 21 frames against the committed golden — bit-identical on a matching backend, tiny f32 drift otherwise.", source: "verify.py _gate_neural_ca — full-sweep mirror" },
  ],
  code_anchors: codeAnchors,
  links: {
    kernel: WGSL_PATH,
    spec: "docs/sim-specs/continuous-ca/neural-ca/spec-ref.md",
    determinism_registry: REGISTRY_PATH,
    tolerance_table: TOL_PATH,
    gate_source: VERIFY_PATH,
    charter_audit: CHARTER_AUDIT,
    resolution_audit: RESOLUTION_AUDIT,
    perf_ledger: LEDGER_PATH,
    capture_manifest: MANIFEST_PATH,
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
