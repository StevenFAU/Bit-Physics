// fdtd-optics — build-time data spine (heat-equation gen-verification
// pattern). FAIL-HARD contract: any drift between the committed golden
// tables, the Python-f64 gate assets, the JS-f64 mirror, the tolerance
// registry, the CI gate registration, and the web constants exits non-zero
// and blocks the build.

import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GATE64,
  dispersionVpRatio,
  fresnelRsRp,
  runGate64,
} from "./src/fdtd64.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const tablesDir = join(repo, "tools", "testkit", "golden", "tables", "electromagnetics");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`GEN-VERIFICATION FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// --- 1. tolerance registry ---------------------------------------------------
const tol = readFileSync(join(repo, "tools", "testkit", "equivalence", "tolerance.toml"), "utf8");
const mDef = tol.match(/\[defaults\.fdtd-optics\]\s*\nrelative = ([0-9.e+-]+)/);
if (!mDef) fail("tolerance.toml missing [defaults.fdtd-optics]");
const tolRelative = mDef ? Number(mDef[1]) : NaN;
if (!tol.includes("[overrides.fdtd-optics]")) fail("tolerance.toml missing [overrides.fdtd-optics]");
ok(`tolerance.toml [defaults.fdtd-optics] relative = ${tolRelative}`);

// --- 2. CI gate registration -------------------------------------------------
const pipeline = readFileSync(
  join(repo, "tools", "productization", "web-deploy", "pipeline.py"),
  "utf8",
);
if (!pipeline.includes('"fdtd-optics": "new_canonical"'))
  fail('pipeline.py missing "fdtd-optics": "new_canonical"');
const verifyPy = readFileSync(
  join(repo, "tools", "productization", "web-deploy", "verify.py"),
  "utf8",
);
const grab = (name) => {
  const m = verifyPy.match(new RegExp(`${name} = ([0-9.e+-]+)`));
  if (!m) {
    fail(`verify.py missing ${name}`);
    return NaN;
  }
  return Number(m[1]);
};
const trajRel = grab("T_FDTD_TRAJ_REL");
const fresnelRel = grab("T_FDTD_FRESNEL_REL");
const mieRel = grab("T_FDTD_MIE_REL");
if (trajRel !== tolRelative)
  fail(`verify.py T_FDTD_TRAJ_REL ${trajRel} != tolerance.toml ${tolRelative}`);
ok(`verify.py thresholds: traj ${trajRel}, fresnel ${fresnelRel}, mie ${mieRel}`);

// --- 3. golden tables --------------------------------------------------------
// 3a. Fresnel closed forms: recompute every table point in JS f64.
const fresnelTable = readJson(join(tablesDir, "fdtd-optics-fresnel.json"));
let fresnelChecked = 0;
for (const tp of fresnelTable.test_points) {
  const inp = tp.inputs;
  if (inp.theta_deg === undefined) continue;
  const { rs, rp } = fresnelRsRp(inp.theta_deg, inp.n1, inp.n2);
  const want = tp.expected;
  for (const [k, v] of [
    ["r_s", rs],
    ["r_p", rp],
  ]) {
    if (want[k] === undefined) continue;
    const err = Math.abs(v - want[k]) / Math.max(Math.abs(want[k]), 1e-30);
    if (err > 1e-12 && Math.abs(v - want[k]) > 1e-14)
      fail(`fresnel table ${k}@${inp.theta_deg}deg drift: js ${v} vs table ${want[k]}`);
    fresnelChecked++;
  }
}
if (fresnelChecked < 10) fail(`fresnel table: only ${fresnelChecked} points recomputed`);
ok(`fresnel table: ${fresnelChecked} values recomputed in JS f64`);

// 3b. cylinder Mie: lossless optical-theorem self-check (ext == sca) per row +
//     extract the TM m=1.5 rows and pin the capture.ts gate anchors.
const mieTable = readJson(join(tablesDir, "fdtd-optics-mie-cylinder.json"));
const mieTm15 = [];
for (const tp of mieTable.test_points) {
  const { x, m_re, m_im, polarization } = tp.inputs;
  const { q_ext, q_sca } = tp.expected;
  if (m_im === 0 && Math.abs(q_ext - q_sca) > 1e-11)
    fail(`mie cylinder x=${x} ${polarization}: lossless ext!=sca (${q_ext} vs ${q_sca})`);
  if (m_re === 1.5 && m_im === 0 && polarization === "TM")
    mieTm15.push({ x, q_sca: q_sca });
}
mieTm15.sort((a, b) => a.x - b.x);
const captureTs = readFileSync(join(here, "src", "capture.ts"), "utf8");
for (const x of [3, 5]) {
  const row = mieTm15.find((r) => r.x === x);
  if (!row) {
    fail(`mie cylinder table missing TM m=1.5 x=${x}`);
    continue;
  }
  const lit = row.q_sca.toFixed(6);
  if (!captureTs.includes(lit))
    fail(`capture.ts MIE.qGolden missing table value ${lit} for x=${x} (drift?)`);
}
ok(`mie cylinder table: ext==sca on all lossless rows; capture.ts anchors pinned`);

// 3c. sphere trust anchors (spec pins).
const sph = readJson(join(tablesDir, "fdtd-optics-mie-sphere-anchors.json"));
const sphPoint = sph.test_points.find((t) => Math.abs(t.inputs.x - 5.21282) < 1e-9);
if (!sphPoint || Math.abs(sphPoint.expected.q_ext - 3.105425) > 5e-5)
  fail("sphere anchor x=5.21282 lost the Wiscombe pin 3.105425");
ok("sphere Wiscombe trust anchor pinned");

// 3d. slab n_eff pair (bounds + spec pins). NaN-hard: use !(err <= tol) so a
// missing key FAILS instead of sliding through a false NaN comparison.
const slab = readJson(join(tablesDir, "fdtd-optics-slab-neff.json"));
const neff = {};
for (const tp of slab.test_points) {
  if (tp.inputs.polarization !== undefined && tp.inputs.mode === 0)
    neff[`${tp.inputs.polarization}0`] = tp.expected.n_eff;
}
if (!(Math.abs(neff.TE0 - 2.8631679) <= 1e-5)) fail(`slab TE0 ${neff.TE0} != 2.8631679`);
if (!(Math.abs(neff.TM0 - 2.0826428) <= 1e-5)) fail(`slab TM0 ${neff.TM0} != 2.0826428`);
ok(`slab n_eff pair: TE0 ${neff.TE0}, TM0 ${neff.TM0}`);

// 3e. grating: m=1 order at the exact 30 deg golden.
const grating = readJson(join(tablesDir, "fdtd-optics-grating-orders.json"));
const g1 = grating.test_points.find((t) => t.inputs.m === 1);
if (!g1 || !(Math.abs(g1.expected.theta_deg - 30.0) <= 1e-9))
  fail("grating m=1 order is not the exact 30.0 deg golden");
ok("grating m=1 -> 30.00 deg exact");

// 3f. numerical dispersion: recompute the master relation in JS f64.
const disp = readJson(join(tablesDir, "fdtd-optics-numerical-dispersion.json"));
let worstSlow = 0;
for (const tp of disp.test_points) {
  const { sc, n_lambda, theta_deg } = tp.inputs;
  const js = dispersionVpRatio(sc, n_lambda, theta_deg);
  if (Math.abs(js - tp.expected.vp_ratio) > 1e-9)
    fail(
      `dispersion drift @ Nl=${n_lambda} th=${theta_deg}: js ${js} vs table ${tp.expected.vp_ratio}`,
    );
  worstSlow = Math.max(worstSlow, (1 - tp.expected.vp_ratio) * 100);
}
ok(`dispersion table recomputed; worst slowdown ${worstSlow.toFixed(2)}%`);

// --- 4. gate assets: sidecar sha + JS-f64 bit-exact rerun --------------------
const sidecar = readJson(join(here, "public", "fdtd-gate-tfsf-cyl128-step512.json"));
const bin = readFileSync(join(here, "public", "fdtd-gate-tfsf-cyl128-step512.bin"));
const binSha = createHash("sha256").update(bin).digest("hex");
if (binSha !== sidecar.sha256) fail(`gate bin sha ${binSha} != sidecar ${sidecar.sha256}`);
const p = sidecar.params;
const wantParams = {
  n: GATE64.n,
  sc: GATE64.sc,
  na: GATE64.na,
  t0: GATE64.t0,
  tau: GATE64.tau,
  steps: GATE64.steps,
};
for (const [k, v] of Object.entries(wantParams)) {
  if (p[k] !== v) fail(`sidecar param ${k}=${p[k]} != fdtd64 GATE64.${k}=${v}`);
}
if (
  p.tfsf_box.ia !== GATE64.ia ||
  p.tfsf_box.ib !== GATE64.ib ||
  p.cylinder.cx !== GATE64.cx ||
  p.cylinder.r !== GATE64.r ||
  p.cylinder.eps !== GATE64.epsCyl
) {
  fail("sidecar tfsf/cylinder params drift vs fdtd64 GATE64");
}
// The strong check: the pure-JS f64 mirror, driven by the COMMITTED f64
// Ricker trace (JS Math.exp and numpy exp differ by 1 ULP — the engine-drift
// lesson), must reproduce the committed Python-f64 checkpoints BIT-EXACTLY
// (all remaining ops are elementwise IEEE add/mul in the same order).
const rickerBin = readFileSync(join(here, "public", "fdtd-gate-ricker-f64.bin"));
const rickerSha = createHash("sha256").update(rickerBin).digest("hex");
const srcTrace = new Float64Array(
  rickerBin.buffer.slice(rickerBin.byteOffset, rickerBin.byteOffset + rickerBin.byteLength),
);
if (srcTrace.length !== GATE64.steps)
  fail(`ricker trace length ${srcTrace.length} != ${GATE64.steps}`);
const caps = runGate64(GATE64, null, srcTrace);
const blob = Buffer.alloc(bin.length);
let off = 0;
for (const cp of GATE64.checkpoints) {
  const c = caps.get(cp);
  for (const f of [c.ez, c.hx, c.hy]) {
    Buffer.from(f.buffer).copy(blob, off);
    off += f.byteLength;
  }
}
const jsSha = createHash("sha256").update(blob).digest("hex");
if (jsSha !== sidecar.sha256)
  fail(`JS-f64 gate rerun sha ${jsSha} != committed ${sidecar.sha256} (engine drift!)`);
ok(`gate assets: bin sha pinned + JS-f64 rerun BIT-EXACT (${jsSha.slice(0, 12)}…)`);

// --- 5. WGSL anchors ---------------------------------------------------------
const wgsl = readFileSync(join(here, "src", "fdtd_core.wgsl"), "utf8");
const anchors = {};
for (const fn of ["h_update", "e_update", "tfsf_h", "tfsf_e", "aux_e", "phasor_accum"]) {
  const re = new RegExp(`fn ${fn}\\(`, "g");
  const count = (wgsl.match(re) || []).length;
  if (count !== 1) fail(`WGSL anchor fn ${fn}: ${count} matches (want exactly 1)`);
  anchors[fn] = wgsl.slice(0, wgsl.indexOf(`fn ${fn}(`)).split("\n").length;
}
ok(`WGSL anchors: ${Object.keys(anchors).join(", ")}`);

// --- emit --------------------------------------------------------------------
if (failures > 0) {
  console.error(`\ngen-verification: ${failures} failure(s) — build blocked.`);
  process.exit(1);
}
const out = {
  generated_by: "packages/fdtd-optics/web/gen-verification.mjs",
  gate: {
    kind: "new_canonical",
    descriptor: p.descriptor,
    n: GATE64.n,
    sc: GATE64.sc,
    steps: GATE64.steps,
    checkpoints: GATE64.checkpoints,
    determinism_witness: sidecar.determinism_witness_sha256,
  },
  reference_bin: {
    file: sidecar.file,
    sha256: sidecar.sha256,
    js_f64_rerun: "bit-exact",
    ricker_trace: { file: "fdtd-gate-ricker-f64.bin", sha256: rickerSha },
  },
  tolerance: {
    category: "fdtd-optics",
    relative: tolRelative,
    fresnel_relative: fresnelRel,
    mie_relative: mieRel,
    measured_basis:
      "MEASURED 2026-07-09 f32-proxy worst 6.6e-7 of global peak, all 4 checkpoints x 3 fields",
  },
  goldens: {
    mie_cylinder_tm: mieTm15,
    slab_te0: neff.TE0,
    slab_tm0: neff.TM0,
    dispersion_worst_pct: Number(worstSlow.toFixed(2)),
  },
  wgsl_anchors: anchors,
};
mkdirSync(join(here, "src", "generated"), { recursive: true });
writeFileSync(
  join(here, "src", "generated", "verification.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log("gen-verification: all checks passed; verification.json written.");
