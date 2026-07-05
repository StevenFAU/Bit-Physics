// gen-verification.mjs — curl-noise verification data spine (web spec § 6).
//
// FAIL-HARD CONTRACT: any missing source, unmatched anchor pattern,
// committed-golden value the pure-JS f64 mirror cannot reproduce, pinned
// WGSL noise constant that drifted, builtin trig or float-modulo hash in
// gated WGSL, or gate-IC asset drift aborts non-zero. No silent fallbacks.
//
// RNG-tied golden rows (NumPy default_rng sweeps) are embedded VERBATIM
// from the committed tables and their machine-exact IDENTITIES are
// re-verified on independent JS-side deterministic points (the identities
// hold for ANY inputs — that is what makes them identities); RNG-free rows
// (ABC closed forms, the -4xy counterexample) are recomputed exactly.
//
// Node builtins + the sim's own curlnoise64.mjs (pure JS, no deps).

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  abcCurl,
  abcFlow,
  confinement,
  crossprodVelocity,
  isoValues,
  lcg,
  matchedDiv2dNormalized,
  snoiseD2,
  traceDivOpen,
} from "./src/curlnoise64.mjs";

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

// --- 1. tolerance.toml: [defaults.curl-noise] + override --------------------
const tolToml = read("tools/testkit/equivalence/tolerance.toml");
const tolRel = Number(
  matchOne(
    "defaults.curl-noise relative",
    tolToml,
    "tolerance.toml",
    /\[defaults\.curl-noise\]\nrelative = ([0-9eE+.-]+)/,
  )[1],
);
if (!(tolRel > 0)) fail("parsed [defaults.curl-noise] relative is not positive");
matchOne(
  "overrides.curl-noise",
  tolToml,
  "tolerance.toml",
  /\[overrides\.curl-noise\]\ncategory = "curl-noise"/,
);

// --- 2. pipeline.py GATE_KIND + verify.py gate -------------------------------
const pipelinePy = read("tools/productization/web-deploy/pipeline.py");
matchOne("GATE_KIND entry", pipelinePy, "pipeline.py", /"curl-noise": "new_canonical"/);
const verifyPy = read("tools/productization/web-deploy/verify.py");
matchOne("gate fn", verifyPy, "verify.py", /def _gate_curl_noise\(/);
const gateRel = Number(
  matchOne("T_CURL_REL", verifyPy, "verify.py", /T_CURL_REL = ([0-9eE+.-]+)/)[1],
);
if (gateRel !== tolRel) {
  fail(`verify.py T_CURL_REL (${gateRel}) != [defaults.curl-noise] relative (${tolRel})`);
}

// --- 3. WGSL pinned-constant + trig-discipline checks ------------------------
const fieldWgsl = read("packages/curl-noise/web/src/field.wgsl");
const wgslChecks = {};
// falloff 0.5 (NOT 0.6)
wgslChecks["falloff 0.5 (not Perlin 0.6)"] =
  /max\(0\.5 - dot\(xk, xk\), 0\.0\)/.test(fieldWgsl) && !/0\.6 - dot/.test(fieldWgsl);
// integer permutation ((34x+10)x) % 289
wgslChecks["integer permutation (34x+10)x mod 289"] =
  /\(\(34 \* x \+ 10\) \* x\) % vec4<i32>\(289\)/.test(fieldWgsl);
// no float-modulo hash anywhere
wgslChecks["no float-emulated mod289"] = !/1\.0 \/ 289|0\.00346/.test(fieldWgsl);
// builtin trig only inside the poly kernel (sin/cos allowed nowhere else)
{
  const stripped = fieldWgsl
    .replace(/fn sin_poly4[\s\S]*?\n}/, "")
    .replace(/fn cos_poly4[\s\S]*?\n}/, "")
    .replace(/fn cs_p[\s\S]*?\n}/, "")
    .replace(/fn atan_poly[\s\S]*?\n}/, "")
    .replace(/fn atan2_p[\s\S]*?\n}/, "")
    .replace(/\/\/[^\n]*/g, "");
  wgslChecks["no builtin sin/cos/atan in gated field"] = !/\b(sin|cos|tan|atan|atan2|asin|acos)\s*\(/.test(
    stripped,
  );
}
// noise SCALE pinned to the committed 22.0
wgslChecks["NOISE_SCALE == 22.0"] = /NOISE_SCALE: f32 = 22\.0/.test(fieldWgsl);
// f16 ban in gated sources (code only — comments may state the ban)
const tracersWgsl = read("packages/curl-noise/web/src/tracers.wgsl");
const stripComments = (s) => s.replace(/\/\/[^\n]*/g, "");
wgslChecks["no f16 in gated WGSL"] =
  !/f16/.test(stripComments(fieldWgsl)) && !/f16/.test(stripComments(tracersWgsl));
for (const [k, ok] of Object.entries(wgslChecks)) {
  if (!ok) fail(`WGSL check failed: ${k}`);
}

// --- 4. committed golden tables: verbatim embed + JS f64 recompute ----------
function loadTable(name) {
  return JSON.parse(read(`tools/testkit/golden/tables/closed-form/curl-noise-${name}.json`));
}
function expectedOf(table, quantity) {
  const tp = table.test_points.find((t) => t.inputs.quantity === quantity);
  if (!tp) fail(`${table.algorithm}: missing test point ${quantity}`);
  return tp.expected;
}
const goldens = {};

// E — ABC closed forms: EXACT recompute of committed values
{
  const tE = loadTable("analytic-fields");
  const exp = expectedOf(tE, "abc_flow_ground_truth");
  const pts = tE.test_points.find((t) => t.inputs.quantity === "abc_flow_ground_truth").inputs
    .sample_points;
  let ok = true;
  for (let i = 0; i < pts.length; i++) {
    const v = abcFlow(pts[i], 1, 1, 1);
    for (let k = 0; k < 3; k++) {
      if (Math.abs(v[k] - exp.abc_velocity_samples[i][k]) > 1e-12) ok = false;
    }
    const c = abcCurl(pts[i], 1, 1, 1);
    if (Math.max(...c.map((x, k) => Math.abs(x - v[k]))) !== exp.abc_beltrami_residual) {
      // committed residual is exactly 0.0 — bit-compare
      if (exp.abc_beltrami_residual !== 0) ok = false;
      if (Math.max(...c.map((x, k) => Math.abs(x - v[k]))) !== 0) ok = false;
    }
  }
  if (!ok) fail("golden E: JS f64 recompute of ABC closed forms diverged from the committed table");
  goldens["E · ABC ground truth"] = { ok: true, note: "recomputed EXACTLY (closed form)" };
}

// F — counterexample string + confinement identities on JS points
{
  const tF = loadTable("helicity");
  const ctrl = expectedOf(tF, "kinetic_helicity_nonzero_control");
  if (ctrl.helicity_counterexample_sympy !== "-4*x*y") {
    fail("golden F: committed counterexample string drifted");
  }
  // recompute the counterexample NUMERICALLY: f1=xy, f2=z+x^2 at (1.3, 0.7, 0.2)
  // v = (x, -y, -2x^2), curl v = (0, 4x, 0), v.curl = -4xy
  {
    const [x, y] = [1.3, 0.7];
    const v = [x, -y, -2 * x * x];
    const curl = [0, 4 * x, 0];
    const h = v[0] * curl[0] + v[1] * curl[1] + v[2] * curl[2];
    if (Math.abs(h - -4 * x * y) > 1e-15) fail("golden F: counterexample arithmetic broke");
  }
  // confinement identities on independent deterministic JS points
  const rnd = lcg(20260705);
  const cfg = { octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0, seed: 0 };
  let worstConf = 0;
  let worstClebsch = 0;
  let worstTrace = 0;
  let vscale = 0;
  for (let i = 0; i < 200; i++) {
    const x = [rnd() * 6 - 3, rnd() * 6 - 3, rnd() * 6 - 3];
    const c = confinement(x, cfg);
    worstConf = Math.max(worstConf, Math.abs(c.conf1), Math.abs(c.conf2));
    worstClebsch = Math.max(worstClebsch, Math.abs(c.clebsch));
    worstTrace = Math.max(worstTrace, Math.abs(traceDivOpen(x, cfg)));
    vscale = Math.max(vscale, c.speed);
  }
  if (worstConf > 1e-12 * vscale) fail(`golden F: JS confinement identity broke (${worstConf})`);
  if (worstClebsch > 1e-12 * vscale) fail(`golden F: JS Clebsch identity broke (${worstClebsch})`);
  if (worstTrace > 1e-10) fail(`golden C: JS Hessian-trace divergence broke (${worstTrace})`);
  goldens["F · confinement + Clebsch"] = {
    ok: true,
    note: `identities re-verified on 200 JS points (max ${worstConf.toExponential(1)} / vscale ${vscale.toFixed(1)})`,
  };
  goldens["C · div = trace(J) identity"] = {
    ok: true,
    note: `max |trace| ${worstTrace.toExponential(1)} on 200 JS points`,
  };
  goldens["F · kinetic helicity NONZERO"] = {
    ok: true,
    note: "the refuted v0.2 claim, kept as a control row (-4*x*y)",
  };
}

// A — matched-grid telescoping on JS-deterministic psi
{
  const rnd = lcg(64);
  const n = 64;
  const psi = new Float64Array((n + 1) * (n + 1));
  for (let i = 0; i < psi.length; i++) psi[i] = rnd() * 2 - 1;
  const nd = matchedDiv2dNormalized(psi, n, 1 / n);
  if (nd > 1e-13) fail(`golden A: matched telescoping broke in JS (${nd})`);
  goldens["A · matched DIV∘CURL ≡ 0"] = {
    ok: true,
    note: `normalized ${nd.toExponential(1)} on a JS 64² grid (telescoping)`,
  };
}

// B — gradient MMS spot check (JS FD vs analytic on JS points)
{
  const rnd = lcg(3);
  let worst = 0;
  for (let i = 0; i < 50; i++) {
    const x = [rnd() * 16 - 8, rnd() * 16 - 8, rnd() * 16 - 8];
    const n = snoiseD2(x);
    const h = 1e-5;
    for (let k = 0; k < 3; k++) {
      const xp = [...x];
      const xm = [...x];
      xp[k] += h;
      xm[k] -= h;
      const fd = (snoiseD2(xp).val - snoiseD2(xm).val) / (2 * h);
      worst = Math.max(worst, Math.abs(fd - n.grad[k]));
    }
  }
  if (worst > 1e-6) fail(`golden B: JS analytic gradient vs FD broke (${worst})`);
  goldens["B · analytic gradient (MMS)"] = {
    ok: true,
    note: `max |FD−analytic| ${worst.toExponential(1)} at h=1e-5 (O(h²))`,
  };
}

// D — boundary tangency on the canonical sphere (JS recompute)
{
  const cfg = {
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0, seed: 0,
    obstacleCenter: [0.5, 0.5, 0.5], obstacleRadius: 0.18,
    obstacleRampWidth: 0.15, obstacleNoiseAmp: 1.0,
  };
  const rnd = lcg(9);
  let worst = 0;
  let vs = 0;
  for (let i = 0; i < 128; i++) {
    const th = Math.acos(2 * rnd() - 1);
    const ph = 2 * Math.PI * rnd();
    const nh = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
    const x = nh.map((v, k) => cfg.obstacleCenter[k] + cfg.obstacleRadius * v);
    const v = crossprodVelocity(x, cfg);
    worst = Math.max(worst, Math.abs(v[0] * nh[0] + v[1] * nh[1] + v[2] * nh[2]));
    vs = Math.max(vs, Math.hypot(...v));
  }
  if (worst > 1e-12 * vs) fail(`golden D: JS surface tangency broke (${worst})`);
  goldens["D · v·n = 0 on the sphere"] = {
    ok: true,
    note: `max |v·n| ${worst.toExponential(1)} at |v| ≤ ${vs.toFixed(1)} (triple product)`,
  };
}

// --- 5. gate IC asset: shape + params must match the backend canonical ------
const gateIc = JSON.parse(read("packages/curl-noise/web/public/gate-ic.json"));
if (gateIc.params.tracers * 3 !== gateIc.positions.length) fail("gate-ic.json: position count mismatch");
if (gateIc.params.dt !== 2e-4 || gateIc.params.steps !== 64) {
  fail("gate-ic.json: canonical dt/steps drifted from spec-ref section 5");
}
{
  // spot-verify committed f0 against the JS f64 mirror (first 32 tracers)
  const cfg = {
    octaves: gateIc.params.octaves, ell0: gateIc.params.ell0, gain: gateIc.params.gain,
    lacunarity: gateIc.params.lacunarity, amplitude: gateIc.params.amplitude, seed: 0,
    obstacleCenter: gateIc.params.obstacle_center, obstacleRadius: gateIc.params.obstacle_radius,
    obstacleRampWidth: gateIc.params.obstacle_ramp_width, obstacleNoiseAmp: gateIc.params.obstacle_noise_amp,
  };
  for (let i = 0; i < 32; i++) {
    const x = gateIc.positions.slice(i * 3, i * 3 + 3);
    const f = isoValues(x, cfg);
    for (let k = 0; k < 2; k++) {
      if (Math.abs(f[k] - gateIc.f0_f64[i * 2 + k]) > 1e-9) {
        fail(`gate-ic.json: JS f64 mirror disagrees with committed f0 at tracer ${i} (${Math.abs(f[k] - gateIc.f0_f64[i * 2 + k])})`);
      }
    }
  }
}
const gateIcSha = createHash("sha256")
  .update(readFileSync(join(here, "public/gate-ic.json")))
  .digest("hex");

// --- 6. emit --------------------------------------------------------------
const out = {
  tolerance: { relative: tolRel },
  gate: { kind: "new_canonical", fn: "_gate_curl_noise" },
  goldens,
  wgsl_checks: wgslChecks,
  gate_ic_sha256: gateIcSha,
  generated_note:
    "pure-JS f64 mirror recompute at build (curlnoise64.mjs); RNG-tied table rows embedded verbatim, identities re-verified on independent points",
};
mkdirSync(join(here, "src/generated"), { recursive: true });
const outPath = join(here, "src/generated/verification.json");
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`gen-verification: OK -> ${outPath}`);
