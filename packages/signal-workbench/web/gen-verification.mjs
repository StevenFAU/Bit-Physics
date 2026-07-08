// signal-workbench — build-time data spine (spec-ref § 5.6). FAIL-HARD:
// every committed value the UI shows is read from the real sources
// (tolerance.toml, web-deploy pipeline/verify, golden tables, the sha-pinned
// reference bin) and cross-checked against a pure-JS f64 recompute
// (dsp64.mjs). Any missing file, unmatched anchor, or diverged golden
// aborts with exit(1) — no silent fallbacks, no retyped constants.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WINDOW_COEFFS,
  besselJArray,
  fmLineBins,
  fmSignal,
  sineSignal,
  toneWindowedDft,
  windowTaps,
} from "./src/dsp64.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const fail = (msg) => {
  console.error(`gen-verification FAIL: ${msg}`);
  process.exit(1);
};
const read = (rel) => {
  try {
    return readFileSync(join(repo, rel), "utf8");
  } catch {
    fail(`cannot read ${rel}`);
  }
};

// --- gate constants (must match capture.ts GATE + the Python sim) ----------
const GATE = {
  n: 4096,
  fm_kc: 512,
  fm_km: 37,
  fm_index: 3.2,
  fm_amplitude: 1.0,
  leak_f0_bins: 100.37,
  leak_amplitude: 0.8,
  leak_phase: 0.3,
  leak_window: "hann",
  descriptor: "fm-bessel-plus-hann-leak-N4096-webgate",
};

// --- 1. tolerance.toml row ---------------------------------------------------
const tol = read("tools/testkit/equivalence/tolerance.toml");
const tolM = tol.match(
  /\[defaults\.signal-workbench\]\s*\nrelative = ([0-9.eE+-]+)/,
);
if (!tolM) fail("tolerance.toml has no [defaults.signal-workbench] relative row");
const tolRel = Number(tolM[1]);
if (!(tolRel > 0)) fail(`bad tolerance relative ${tolM[1]}`);
if (!/\[overrides\.signal-workbench\]\s*\ncategory = "signal-workbench"/.test(tol)) {
  fail("tolerance.toml missing [overrides.signal-workbench] category row");
}

// --- 2. web-deploy wiring parity --------------------------------------------
const pipeline = read("tools/productization/web-deploy/pipeline.py");
if (!/"signal-workbench": "new_canonical"/.test(pipeline)) {
  fail("pipeline.py GATE_KIND missing signal-workbench: new_canonical");
}
const verifyPy = read("tools/productization/web-deploy/verify.py");
const relM = verifyPy.match(/T_SW_REL = ([0-9.eE+-]+)/);
const parsM = verifyPy.match(/T_SW_PARSEVAL = ([0-9.eE+-]+)/);
const lineM = verifyPy.match(/T_SW_LINE_REL = ([0-9.eE+-]+)/);
if (!relM || !parsM || !lineM) fail("verify.py missing T_SW_* thresholds");
if (Number(relM[1]) !== tolRel) {
  fail(`verify.py T_SW_REL ${relM[1]} != tolerance.toml ${tolRel}`);
}

// --- 3. golden table C (FM Bessel) vs JS-f64 recompute ------------------------
const tableC = JSON.parse(
  read("tools/testkit/golden/tables/signal-processing/signal-workbench-fm-bessel.json"),
);
const canonicalPoint = tableC.test_points.find(
  (tp) =>
    tp.inputs.n === GATE.n &&
    tp.inputs.kc === GATE.fm_kc &&
    tp.inputs.km === GATE.fm_km &&
    Math.abs(tp.inputs.index - GATE.fm_index) < 1e-12,
);
if (!canonicalPoint) fail("table C has no canonical gate-scene point");
{
  const jt = besselJArray(GATE.fm_index, 16);
  for (const [order, want] of Object.entries(canonicalPoint.expected.sideband_j_n)) {
    const nAbs = Math.abs(Number(order));
    const sign = Number(order) < 0 && nAbs % 2 === 1 ? -1 : 1;
    const got = sign * jt[nAbs];
    if (Math.abs(got - want) > 1e-12) {
      fail(`JS Bessel J_${order}(${GATE.fm_index}) = ${got} != committed ${want}`);
    }
  }
  // energy identity live
  const big = besselJArray(GATE.fm_index, 80);
  let total = big[0] * big[0];
  for (let k = 1; k <= 80; k++) total += 2 * big[k] * big[k];
  if (Math.abs(1 - total) > 1e-12) fail(`energy identity residual ${Math.abs(1 - total)}`);
}

// --- 4. golden table A coefficient identities ---------------------------------
const tableA = JSON.parse(
  read("tools/testkit/golden/tables/signal-processing/signal-workbench-windows.json"),
);
for (const tp of tableA.test_points) {
  const name = tp.inputs.window;
  if (!(name in WINDOW_COEFFS) || tp.inputs.check) continue;
  const a = WINDOW_COEFFS[name];
  const cg = a[0];
  let sq = 0;
  for (let k = 1; k < a.length; k++) sq += a[k] * a[k];
  const enbw = (a[0] * a[0] + 0.5 * sq) / (a[0] * a[0]);
  if (Math.abs(cg - tp.expected.coherent_gain) > 1e-9) {
    fail(`${name} coherent gain identity ${cg} != ${tp.expected.coherent_gain}`);
  }
  if (Math.abs(enbw - tp.expected.enbw_bins) > 1e-9) {
    fail(`${name} ENBW identity ${enbw} != ${tp.expected.enbw_bins}`);
  }
}

// --- 5. reference bin sha + JS-f64 signal spine check --------------------------
const sidecar = JSON.parse(
  read("packages/signal-workbench/web/public/sw-gate-reference-f64.json"),
);
const binBuf = readFileSync(
  join(repo, "packages/signal-workbench/web/public/sw-gate-reference-f64.bin"),
);
const sha = createHash("sha256").update(binBuf).digest("hex");
if (sha !== sidecar.sha256) fail(`reference bin sha ${sha} != sidecar ${sidecar.sha256}`);
if (binBuf.byteLength !== 6 * GATE.n * 8) fail(`reference bin size ${binBuf.byteLength}`);
for (const [key, want] of Object.entries(GATE)) {
  if (key === "descriptor") continue;
  if (sidecar.gate[key] !== want) fail(`sidecar gate.${key} ${sidecar.gate[key]} != ${want}`);
}
{
  // JS-f64 recompute of the committed reference signals (numpy sin vs JS sin
  // agree to ~1 ULP; bound 1e-12 abs)
  const n = GATE.n;
  const xFmRef = new Float64Array(binBuf.buffer, binBuf.byteOffset, n);
  const xFm = fmSignal(n, GATE.fm_kc, GATE.fm_km, GATE.fm_index, GATE.fm_amplitude);
  let worst = 0;
  for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(xFm[i] - xFmRef[i]));
  if (worst > 1e-12) fail(`JS-f64 FM signal vs committed reference drift ${worst}`);
  const xLeakRef = new Float64Array(binBuf.buffer, binBuf.byteOffset + 3 * n * 8, n);
  const xLeak = sineSignal(n, GATE.leak_f0_bins, GATE.leak_amplitude, GATE.leak_phase);
  worst = 0;
  for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(xLeak[i] - xLeakRef[i]));
  if (worst > 1e-12) fail(`JS-f64 leak signal vs committed reference drift ${worst}`);
  // leak spectrum: committed f64 FFT vs the JS closed-form skirt (F*W)
  const lkRe = new Float64Array(binBuf.buffer, binBuf.byteOffset + 4 * n * 8, n);
  const lkIm = new Float64Array(binBuf.buffer, binBuf.byteOffset + 5 * n * 8, n);
  const golden = toneWindowedDft(
    GATE.leak_window,
    n,
    GATE.leak_f0_bins,
    GATE.leak_amplitude,
    GATE.leak_phase,
  );
  let peak = 0;
  for (let k = 0; k < n; k++) peak = Math.max(peak, Math.hypot(lkRe[k], lkIm[k]));
  worst = 0;
  for (let k = 0; k < n; k++) {
    worst = Math.max(
      worst,
      Math.abs(golden.re[k] - lkRe[k]),
      Math.abs(golden.im[k] - lkIm[k]),
    );
  }
  if (worst / peak > 1e-11) {
    fail(`closed-form skirt vs committed f64 FFT drift ${worst / peak} of peak`);
  }
  // fold bookkeeping: sum of FM line powers = A^2/2 exactly
  const amps = fmLineBins(n, GATE.fm_kc, GATE.fm_km, GATE.fm_index, GATE.fm_amplitude);
  let energy = 0;
  for (let k = 1; k < amps.length; k++) energy += 0.5 * amps[k] * amps[k];
  if (Math.abs(energy - 0.5) > 1e-12) fail(`FM line-power identity drift ${energy - 0.5}`);
  // window taps parity with the sidecar window name
  const w = windowTaps(GATE.leak_window, n);
  if (Math.abs(w[0] - 0) > 1e-15 || Math.abs(w[n / 2] - 1) > 1e-15) {
    fail("hann periodic tap endpoints unexpected");
  }
}

// --- 6. WGSL anchors (EXPLAIN layer line numbers) ------------------------------
const anchorLine = (rel, pattern) => {
  const lines = read(rel).split("\n");
  const hits = lines.flatMap((l, i) => (l.includes(pattern) ? [i + 1] : []));
  if (hits.length !== 1) fail(`anchor '${pattern}' matched ${hits.length}x in ${rel}`);
  return hits[0];
};
const wgslAnchors = {
  coord_of_line: anchorLine(
    "packages/signal-workbench/web/src/workbench_core.wgsl",
    "fn coord_of(",
  ),
  common_fft_marker_line: anchorLine(
    "packages/signal-workbench/web/src/workbench_core.wgsl",
    "//__COMMON_FFT__",
  ),
  fft_pass_line: anchorLine(
    "packages/signal-workbench/web/src/workbench_core.wgsl",
    "fn fft_pass(",
  ),
  poly_trig_line: anchorLine("common/common-web/src/fft-wgsl.ts", "fn cs_p("),
  poly_trig_file: "common/common-web/src/fft-wgsl.ts",
};

// --- 7. emit --------------------------------------------------------------------
const out = {
  generated_by: "gen-verification.mjs (fail-hard data spine; spec-ref § 5.6)",
  gate: {
    kind: "new_canonical",
    descriptor: GATE.descriptor,
    n: GATE.n,
    fm_kc: GATE.fm_kc,
    fm_km: GATE.fm_km,
    fm_index: GATE.fm_index,
    fm_amplitude: GATE.fm_amplitude,
    leak_f0_bins: GATE.leak_f0_bins,
    leak_amplitude: GATE.leak_amplitude,
    leak_phase: GATE.leak_phase,
    leak_window: GATE.leak_window,
    line_rel_threshold: Number(lineM[1]),
    parseval_threshold: Number(parsM[1]),
  },
  tolerance: {
    category: "signal-workbench",
    relative: tolRel,
    measured_basis:
      "2026-07-08 faithful NumPy-f32 proxy of the shared poly-trig Stockham " +
      "WGSL path, worst 2.32e-7 of spectrum peak x 4.05 family spread x ~2 " +
      "margin (tolerance.toml [defaults.signal-workbench])",
  },
  reference_bin: {
    file: sidecar.file,
    sha256: sidecar.sha256,
    layout: sidecar.layout,
    witness_sha256: sidecar.witness_sha256,
  },
  goldens: {
    fm_index: GATE.fm_index,
    sideband_j_n: canonicalPoint.expected.sideband_j_n,
    energy_identity_residual: canonicalPoint.expected.energy_identity_residual,
    js_f64_recompute:
      "Bessel sidebands (Miller recurrence), window-coefficient CG/ENBW " +
      "identities, committed-reference signal + closed-form skirt parity, " +
      "and the FM line-power fold identity verified at build (this script).",
  },
  wgsl_anchors: wgslAnchors,
};
mkdirSync(join(here, "src/generated"), { recursive: true });
writeFileSync(
  join(here, "src/generated/verification.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log("gen-verification OK — src/generated/verification.json");
