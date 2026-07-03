// gen-verification.mjs — per-sim verification data spine (verification-demo-spec § 4).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card,
// EXPLAIN anchors, and live gate re-run cannot drift from the repository.
// The emitted file is committed; this script re-runs on prebuild/predev and
// must be idempotent (`node gen-verification.mjs && git diff --exit-code`).
//
// FAIL-HARD CONTRACT (spec § 4): any missing source file, WGSL anchor pattern
// that does not match exactly once, unparsed verify.py/ledger/golden value, or
// canonical-DE extract whose sha diverges from its own values aborts with a
// non-zero exit. No silent fallbacks.
//
// Node builtins only (the rd2d/ising template).

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

function matchOne(label, text, sourcePath, re) {
  const m = text.match(re);
  if (!m) fail(`${sourcePath}: anchored pattern for "${label}" did not match (${re})`);
  return m;
}

// --- 1. Canonical capture manifest (params/checksum/determinism, verbatim) --

const MANIFEST_PATH = "captures/mandelbulb-explorer-ref/de-probe-points-seed42.json";
const manifest = JSON.parse(read(MANIFEST_PATH));
for (const [path, val] of [
  ["config.params", manifest.config?.params],
  ["config.seed", manifest.config?.seed],
  ["config.dims", manifest.config?.dims],
  ["payload.checksum", manifest.payload?.checksum],
  ["determinism.claimed", manifest.determinism?.claimed],
]) {
  if (val === undefined) fail(`${MANIFEST_PATH}: missing field ${path}`);
}
if (/^sha256:0+$/.test(manifest.payload.checksum) || manifest.payload.checksum.length < 71) {
  fail(`${MANIFEST_PATH}: payload checksum is not a real digest`);
}
if (manifest.determinism.claimed !== "bit-exact-same-hw") {
  fail(`${MANIFEST_PATH}: determinism.claimed ${manifest.determinism.claimed} != bit-exact-same-hw`);
}

// --- 2. Gate source (verify.py, anchored) — the § 2 pass-criterion FACT -----

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
matchOne("gate fn", verifyPy, VERIFY_PATH, /def _gate_mandelbulb\(/);
matchOne("gate kind", verifyPy, VERIFY_PATH, /sim="mandelbulb-explorer",\s*\n\s*kind="new_canonical",/);
// the load-bearing fact: passed = run-twice identity ALONE (spec § 2)
matchOne("pass criterion", verifyPy, VERIFY_PATH, /passed=bool\(twice\),/);
matchOne("scale definition", verifyPy, VERIFY_PATH, /scale = float\(np\.abs\(de_ref\)\.max\(\)\)/);
const relStr = matchOne(
  "established threshold string",
  verifyPy,
  VERIFY_PATH,
  /"mandelbulb_closed_form_rel": "([0-9.e-]+)",/,
)[1];
const rel = Number(matchOne("T_MANDELBULB_REL", verifyPy, VERIFY_PATH, /^T_MANDELBULB_REL = ([0-9.e-]+)/m)[1]);
if (!(Number.isFinite(rel) && rel === Number(relStr))) {
  fail(`${VERIFY_PATH}: T_MANDELBULB_REL ${rel} != established string ${relStr}`);
}

// --- 3. Golden anchor table (expected.DE ONLY — spec § 2 upstream flag) -----

const GOLDEN_PATH = "tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json";
const golden = JSON.parse(read(GOLDEN_PATH));
if (!Array.isArray(golden.test_points) || golden.test_points.length !== 3) {
  fail(`${GOLDEN_PATH}: want exactly 3 test points`);
}
const anchorMeta = {
  origin: { closed_form: "0 (in-set sentinel)", note: "z stays 0 forever — never escapes" },
  "bounding-sphere-x-axis": {
    closed_form: "½·√257·ln√257 / (576√2+1)",
    note: "escape at the third radius check; integers 1, 257 and the surd 576√2+1 are FP-drift-robust",
  },
  "far-field-x-axis-10": {
    closed_form: "5·ln 10 — exact: immediate escape, dz = 1",
    note: "|c| = 10 > 2 and the escape test precedes the derivative update — exact, not asymptotic",
  },
};
const anchors = golden.test_points.map((tp) => {
  const name = tp.inputs?.name;
  const meta = anchorMeta[name];
  if (!meta) fail(`${GOLDEN_PATH}: unexpected test point name ${name}`);
  if (typeof tp.expected?.DE !== "number") fail(`${GOLDEN_PATH}: ${name} missing expected.DE`);
  for (const [k, want] of [["p", 8], ["escape_radius", 2], ["n_max", 16]]) {
    if (tp.inputs[k] !== want) fail(`${GOLDEN_PATH}: ${name} inputs.${k} ${tp.inputs[k]} != canonical ${want}`);
  }
  return { name, c: tp.inputs.c, de: tp.expected.DE, ...meta };
});
const goldenTol = golden.tolerance;
if (goldenTol?.absolute !== 1e-12 || goldenTol?.relative !== 1e-13) {
  fail(`${GOLDEN_PATH}: tolerance drifted from the committed 1e-12/1e-13`);
}

// --- 4. Canonical-DE extract: re-hash the embedded values -------------------

const EXTRACT_PATH = "packages/mandelbulb-explorer/web/canonical-de-extract.json";
const extract = JSON.parse(read(EXTRACT_PATH));
function shaOfF64(values, label) {
  if (!Array.isArray(values)) fail(`${EXTRACT_PATH}: ${label} is not an array`);
  const f64 = new Float64Array(values);
  return createHash("sha256").update(Buffer.from(f64.buffer)).digest("hex");
}
if (extract.de_values.length !== 256) fail(`${EXTRACT_PATH}: want 256 DE values`);
if (extract.points.length !== 256 * 3) fail(`${EXTRACT_PATH}: want 768 point coords`);
if (shaOfF64(extract.de_values, "de_values") !== extract.de_sha256) {
  fail(`${EXTRACT_PATH}: de_values sha drifted — rerun extract-canonical-de.py`);
}
if (shaOfF64(extract.points, "points") !== extract.points_sha256) {
  fail(`${EXTRACT_PATH}: points sha drifted — rerun extract-canonical-de.py`);
}
if (extract.source_payload_sha256 !== manifest.payload.checksum) {
  fail(`${EXTRACT_PATH}: source payload sha diverged from the committed manifest — rerun the extractor`);
}
const scale = Math.max(...extract.de_values.map(Math.abs));
if (scale !== extract.scale_max_abs_de) fail(`${EXTRACT_PATH}: scale drifted`);
const budgetAbs = rel * scale;
const nOutside = extract.de_values.filter((v) => v > 0).length;
if (nOutside !== extract.n_outside_set) fail(`${EXTRACT_PATH}: n_outside drifted`);

// --- 5. Perf-ledger rows + the recorded browser floor -----------------------

const LEDGER_PATH = "docs/perf-ledger.md";
const ledger = read(LEDGER_PATH);
const refRow = matchOne(
  "numpy-reference ledger row",
  ledger,
  LEDGER_PATH,
  /^\| mandelbulb-explorer \| numpy-reference \| de-probe-points-seed42 \| ([0-9.]+) \|.*$/m,
);
const browserRow = matchOne(
  "webgpu ledger row",
  ledger,
  LEDGER_PATH,
  /^\| mandelbulb-explorer \| webgpu-headless-chromium \| de-probe-points-seed42 \| ([0-9.]+) \|.*$/m,
);
const recordedFloor = Number(
  matchOne("recorded browser floor", browserRow[0], LEDGER_PATH, /f32-vs-f64 DE max_abs \*\*([0-9.e-]+)\*\* \(== the wgpu-native gate\)/)[1],
);
matchOne("run-twice statement", browserRow[0], LEDGER_PATH, /run-twice byte-identical/);
// the honest-miss invariant (spec § 2): the f32 floor sits ABOVE the strict
// f64 budget; if this ever flips, the § 3.3 copy is stale — fail the build.
if (!(recordedFloor > budgetAbs)) {
  fail(`recorded floor ${recordedFloor} no longer sits above the strict budget ${budgetAbs} — the honest-miss framing is stale`);
}

const RESOLUTION_AUDIT = "docs/_audits/phase-5/browser-divergence-resolution-landing-2026-06-09T13-24-25Z.md";
matchOne(
  "5.1 audit row",
  read(RESOLUTION_AUDIT),
  RESOLUTION_AUDIT,
  /mandelbulb-explorer \| identical \(passing\) \| byte-identical \(== 5\.1\) \| new_canonical PASS/,
);

// --- 6. WGSL code anchors (exact-substring, must match exactly once) --------

const WGSL_PATH = "packages/mandelbulb-explorer/src/mandelbulb_de.wgsl";
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
  params: anchorLine("params", "struct Params { n_points: u32, p: u32, escape_radius: f32, n_max: u32, };"),
  pow_z: anchorRange(
    "pow_z",
    "fn pow_z(z: vec3<f32>, p: f32) -> vec3<f32> {",
    "return vec3<f32>(rp * sin_pt * cos(pphi), rp * sin_pt * sin(pphi), rp * cos(pt));",
  ),
  escape_check: anchorRange("escape_check", "if (r2 > er2) {", "return 0.5 * r * log(r) / dz;"),
  de: anchorLine("de", "return 0.5 * r * log(r) / dz;"),
  derivative: anchorLine("derivative", "dz = p * pow(r, p - 1.0) * dz + 1.0;"),
  map: anchorLine("map", "z = pow_z(z, p) + c;"),
};

// --- 7. Template gallery definitions (captions positioned from § 2.2) -------

const templates = [
  {
    id: "canonical-p8",
    label: "canonical p8",
    caption: "The verified object — the display mirrors the gated p=8 kernel on its default look.",
    source: "White & Nylander 2009 (Skytopia); the committed kernel's pinned parameter",
    params: { power: 8, julia: false, colorMode: 1, cmap: "inferno" },
  },
  {
    id: "unfolding",
    label: "unfolding",
    caption: "Fractional powers morph the bulb in real time — the classic power-sweep. Display uniform only; the gate stays pinned at p=8.",
    source: "Maths Town, “The Mandelbulb: all powers”; Skytopia power gallery",
    params: { morph: true, colorMode: 1, cmap: "magma" },
  },
  {
    id: "juliabulb",
    label: "juliabulb",
    caption: "Juliabulb — the same p8 triplex power with a fixed c-offset; the display derivative drops the +1 (c is constant).",
    source: "Quílez, distance to fractals (Julia dz recurrence); Ray Tracing Gems II Ch. 33 (da Silva et al. 2021)",
    params: { power: 8, julia: true, juliaC: [0.0, 0.65, 0.3], colorMode: 2, cmap: "plasma" },
  },
  {
    id: "blobby-n3",
    label: "n = 3",
    caption: "Low power — little of the p8 filigree survives; White found detail only from n≈8 (“a surprising find”).",
    source: "Skytopia p2 — power 8 as the “sweet spot for overall detail and beauty”",
    params: { power: 3, julia: false, colorMode: 1, cmap: "inferno" },
  },
  {
    id: "detail-n16",
    label: "n = 16",
    caption: "High power — more lobes, finer surface froth; same DE form, p is a display uniform.",
    source: "Maths Town all-powers survey",
    params: { power: 16, julia: false, colorMode: 1, cmap: "inferno" },
  },
  {
    id: "smooth-escape",
    label: "smooth escape",
    caption: "De-banded fractional iteration count as the color driver.",
    source: "Quílez, smooth iteration count (msetsmooth)",
    params: { power: 8, julia: false, colorMode: 2, cmap: "viridis" },
  },
  {
    id: "hero",
    label: "hero light",
    caption: "Low sun, wide penumbra, orbit-trap palette — the poster look.",
    source: "Quílez, penumbra soft shadows (rmshadows); orbit traps (orbittraps3d)",
    params: { power: 8, julia: false, colorMode: 1, cmap: "magma", lightAz: 2.2, lightEl: 0.25, shadowSoft: 6, exposure: 1.9 },
  },
  {
    id: "deep-zoom",
    label: "f32 floor",
    caption: "Zoomed to where single precision runs out — WGSL has no f64 type; the surface dissolves into the floor the PROVE panel measures.",
    source: "W3C WGSL spec (f32 + gated f16 only); the deep-zoom limiter of every browser fractal",
    params: { power: 8, julia: false, colorMode: 2, cmap: "cividis", nIter: 40, camera: { angle: 0.62, elev: 0.15, dist: 0.045, target: [0.62, 0.18, 0.62] } },
  },
  {
    id: "probe-grid",
    label: "probe grid",
    caption: "The gate, visible: the 16×16 seed-42-jittered z=0 probe points the wgpu-native gate verifies, colored by canonical DE.",
    source: "tools/productization/web-deploy/verify.py — _gate_mandelbulb; captures/mandelbulb-explorer-ref",
    params: { power: 8, julia: false, colorMode: 0, cmap: "viridis", overlay: true, camera: { angle: 0.9, elev: 0.9, dist: 3.1, target: [0, 0, 0] } },
  },
];

// --- 8. Emit -----------------------------------------------------------------

const out = {
  _generated_by: "packages/mandelbulb-explorer/web/gen-verification.mjs — do not edit by hand",
  sim: "mandelbulb-explorer",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "new_canonical",
    // verbatim from verify.py: passed=bool(twice) — run-twice identity ALONE.
    // The f32-vs-f64 max_abs is REPORTED alongside an informational
    // round_trip flag that is False on a healthy run (spec § 2).
    passed_criterion: "run_twice_identical",
    closed_form_rel: rel,
    scale,
    budget_abs: budgetAbs,
    recorded_browser: {
      f32_vs_f64_de_max_abs: recordedFloor,
      round_trip_at_1e5: recordedFloor <= budgetAbs,
      run_twice: "byte-identical",
      hardware: "RX 6800 XT / ANGLE-Vulkan (headless Chromium)",
    },
  },
  // measured-then-declared (docs/architecture.md § 2.6): per-anchor |f32−f64|
  // display bounds. MEASURED 2026-07-03 on RX 6800 XT / ANGLE-Vulkan headless
  // Chromium: origin 0 (exact — the kernel's in-set sentinel is a literal),
  // bounding-sphere 1.30e-6, far-field 6.37e-7. DECLARED at ~8× the measured
  // values for cross-GPU headroom (WGSL transcendental precision is
  // implementation-defined); a visitor GPU exceeding them renders OVER
  // honestly (spec § 3.3 cross-hw honesty). Never widened silently.
  anchors_display_tol_abs: {
    origin: 0,
    "bounding-sphere-x-axis": 1e-5,
    "far-field-x-axis-10": 5e-6,
  },
  anchors,
  golden_tolerance: goldenTol,
  determinism: { claimed: manifest.determinism.claimed },
  canonical: {
    descriptor: "de-probe-points-seed42",
    seed: manifest.config.seed,
    grid: manifest.config.dims,
    params: manifest.config.params,
    payload_sha256: manifest.payload.checksum,
    n_outside_set: nOutside,
    wall_clock_reference_s: Number(refRow[1]),
    wall_clock_browser_s: Number(browserRow[1]),
  },
  canonical_de: {
    values: extract.de_values,
    sha256: extract.de_sha256,
    extracted_from: extract.extracted_from,
  },
  canonical_points: {
    values: extract.points,
    sha256: extract.points_sha256,
  },
  templates,
  code_anchors: codeAnchors,
  links: {
    kernel: WGSL_PATH,
    display_shader: "packages/mandelbulb-explorer/web/src/render.wgsl",
    spec: "docs/sim-specs/closed-form/mandelbulb-explorer/spec-ref.md",
    algebraic: "docs/sim-specs/closed-form/mandelbulb-explorer/algebraic.md",
    determinism: "docs/sim-specs/closed-form/mandelbulb-explorer/determinism.md",
    golden_table: GOLDEN_PATH,
    golden_derivation: "tools/testkit/golden/derivations/mandelbulb-de-samples.md",
    gate_source: VERIFY_PATH,
    capture_manifest: MANIFEST_PATH,
    perf_ledger: LEDGER_PATH,
    resolution_audit: RESOLUTION_AUDIT,
  },
  external: {
    quilez_mandelbulb: "https://iquilezles.org/articles/mandelbulb/",
    quilez_distancefractals: "https://iquilezles.org/articles/distancefractals/",
    rtgems2_ch33: "https://arxiv.org/abs/2102.01747",
    hvidtfeldt_v:
      "http://blog.hvidtfeldts.net/index.php/2011/09/distance-estimated-3d-fractals-v-the-mandelbulb-different-de-approximations/",
    hart_1989: "https://dl.acm.org/doi/10.1145/74334.74363",
    skytopia: "https://www.skytopia.com/project/fractal/2mandelbulb.html",
  },
};

// links must resolve at HEAD — a moved doc must break the build, not the card
for (const [k, relPath] of Object.entries(out.links)) {
  try {
    readFileSync(join(repoRoot, relPath));
  } catch {
    fail(`links.${k}: ${relPath} does not resolve at HEAD`);
  }
}

const outDir = join(here, "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "verification.json"), JSON.stringify(out, null, 2) + "\n");
console.log(
  `gen-verification: OK — src/generated/verification.json (scale ${scale.toFixed(6)}, budget ${budgetAbs.toExponential(3)}, floor ${recordedFloor})`,
);
