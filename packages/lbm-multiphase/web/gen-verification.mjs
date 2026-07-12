// lbm-multiphase — build-time data spine (heat-equation/fdtd gen-verification
// pattern). FAIL-HARD contract: any drift between the committed golden
// tables, the Python-f64 gate assets, the tolerance registry, the CI gate
// registration, the sha pins in sim.py, and the web constants exits
// non-zero and blocks the build.

import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const tablesDir = join(repo, "tools", "testkit", "golden", "tables", "lattice");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`GEN-VERIFICATION FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// --- 1. tolerance registry ---------------------------------------------------
const tol = readFileSync(join(repo, "tools", "testkit", "equivalence", "tolerance.toml"), "utf8");
const mDef = tol.match(/\[defaults\.lbm-multiphase\]\s*\nrelative = ([0-9.e+-]+)/);
if (!mDef) fail("tolerance.toml missing [defaults.lbm-multiphase]");
const tolRelative = mDef ? Number(mDef[1]) : NaN;
if (!tol.includes("[overrides.lbm-multiphase]")) fail("tolerance.toml missing [overrides.lbm-multiphase]");
const bud = readFileSync(join(repo, "tools", "testkit", "equivalence", "tolerance-budget.toml"), "utf8");
if (!bud.includes("[budgets.lbm-multiphase.cross_stack]"))
  fail("tolerance-budget.toml missing [budgets.lbm-multiphase.cross_stack]");
ok(`tolerance.toml [defaults.lbm-multiphase] relative = ${tolRelative}`);

// --- 2. CI gate registration -------------------------------------------------
const pipeline = readFileSync(
  join(repo, "tools", "productization", "web-deploy", "pipeline.py"),
  "utf8",
);
if (!pipeline.includes('"lbm-multiphase": "new_canonical"'))
  fail('pipeline.py missing "lbm-multiphase": "new_canonical"');
const verifyPy = readFileSync(
  join(repo, "tools", "productization", "web-deploy", "verify.py"),
  "utf8",
);
const grab = (name) => {
  // tolerate ruff-format wrapping: `NAME = (\n    5e-4  # comment\n)`
  const m = verifyPy.match(new RegExp(`${name} = \\(?\\s*([0-9.e+-]+)`));
  if (!m) {
    fail(`verify.py missing ${name}`);
    return NaN;
  }
  return Number(m[1]);
};
const trajRel = grab("T_LBMM_TRAJ_REL");
const coexRelL = grab("T_LBMM_COEX_REL_L");
const coexRelV = grab("T_LBMM_COEX_REL_V");
const tauSpread = grab("T_LBMM_TAU_SPREAD_ABS");
const lapRel = grab("T_LBMM_LAPLACE_REL");
const lapR2 = grab("T_LBMM_LAPLACE_R2_MIN");
const spuriousMax = grab("T_LBMM_SPURIOUS_MAX");
const nosepMax = grab("T_LBMM_NOSEP_SPREAD_MAX");
if (trajRel !== tolRelative)
  fail(`verify.py T_LBMM_TRAJ_REL ${trajRel} != tolerance.toml ${tolRelative}`);
ok(`verify.py thresholds: traj ${trajRel}, coex ${coexRelL}/${coexRelV}, tau ${tauSpread}`);

// --- 3. gate manifest + committed assets --------------------------------------
const man = readJson(join(here, "public", "lbm-gate-manifest.json"));
const hashPublic = (file) => sha256(readFileSync(join(here, "public", file)));
if (hashPublic(man.assets.psi_lut.file) !== man.assets.psi_lut.sha256)
  fail("psi LUT sha drift vs manifest");
// the Python runtime loads the packaged copy (np.exp is microarch-dependent,
// so sha-pinned paths read committed bytes) — the two copies must be identical
const pkgLut = sha256(
  readFileSync(
    join(repo, "packages", "lbm-multiphase", "lbm_multiphase", "data", "psi-lut-f64.bin"),
  ),
);
if (pkgLut !== man.assets.psi_lut.sha256)
  fail("packaged psi LUT (lbm_multiphase/data) drift vs web/public copy");
for (const key of ["ic_flatA", "ic_dropletB", "ic_nosep"]) {
  if (hashPublic(man.assets[key].file) !== man.assets[key].sha256)
    fail(`${key} sha drift vs manifest`);
}
for (const [r, sha] of Object.entries(man.assets.ic_laplaceA)) {
  if (hashPublic(`lbm-gate-ic-laplaceA-r${r}.bin`) !== sha)
    fail(`laplace IC r=${r} sha drift vs manifest`);
}
// reference bins: manifest sha == file sha == sim.py pins
const simPy = readFileSync(
  join(repo, "packages", "lbm-multiphase", "lbm_multiphase", "sim.py"),
  "utf8",
);
for (const key of ["flat", "droplet"]) {
  const entry = man.assets.reference_bins[key];
  if (hashPublic(entry.file) !== entry.sha256) fail(`reference ${key} bin sha drift`);
  if (!simPy.includes(entry.sha256))
    fail(`sim.py REFERENCE_SHA256 missing ${key} pin ${entry.sha256.slice(0, 12)}…`);
}
// scene sanity: gate scenes carry the canonical operating points
if (man.scenes.flat.G !== -9 || man.scenes.flat.forcing !== "guo")
  fail("flat gate scene drifted from the canonical Tier-A point");
if (man.scenes.droplet.forcing !== "li-sigma" || man.scenes.droplet.sigma !== 0.105)
  fail("droplet gate scene drifted from the canonical Tier-B point");
ok("gate manifest: all asset shas pinned; sim.py reference pins match");

// --- 4. committed golden tables ------------------------------------------------
// Tables are golden-v1 schema-pure: everything lives in test_points, keyed
// here by inputs.name (mirrors tests/test_golden_tables.py).
const pointsByName = (file) =>
  Object.fromEntries(
    readJson(join(tablesDir, file)).test_points.map((tp) => [tp.inputs.name, tp]),
  );
const coex = pointsByName("lbm-multiphase-coexistence.json");
const tauPt = coex["measured-tau-independence"].expected;
if (tauPt.tau_spread_rho_l >= 1e-12)
  fail("coexistence table: tau spread not machine-level");
if (tauPt.sc_shift_tau_drift_rho_l <= 1e-2)
  fail("coexistence table: SC-shift negative control lost its tau drift");
const gc = coex["gc-negative-control-sc94"].expected;
if (Math.abs(gc.G_c_bisection - gc.G_c_analytic) > 1e-6)
  fail("coexistence table: G_c bisection drifted from -4 (convention broke!)");
const disc = coex["eps-discrimination-TTc0.7"].expected;
const errEps = Math.abs(disc.measured_rho_v / disc.eps_target_rho_v - 1);
const errMx = Math.abs(disc.measured_rho_v / disc.maxwell_target_rho_v - 1);
if (!(errEps < 0.01 && errMx > 0.02))
  fail("coexistence table: eps-discrimination exhibit lost its verdict");
// manifest Maxwell targets must match the table's canonical-G point
const mx = coex["maxwell-exp-psi-G-9.0"].expected;
if (
  Math.abs(mx.rho_l - man.targets.maxwell_tier_a.rho_l) > 1e-12 ||
  Math.abs(mx.rho_v - man.targets.maxwell_tier_a.rho_v) > 1e-12
)
  fail("manifest Maxwell targets drift vs coexistence table");
const lap = pointsByName("lbm-multiphase-laplace.json");
const lapFitA = lap["laplace-A-fit"].expected;
const lapFitB = lap["laplace-B-fit"].expected;
if (lapFitA.r_squared < 0.999 || lapFitB.r_squared < 0.999)
  fail("laplace table: linearity lost");
const ca = pointsByName("lbm-multiphase-contact-angle.json");
const caRows = Object.values(ca)
  .filter((tp) => tp.expected.theta_deg !== null && tp.expected.theta_deg !== undefined)
  .map((tp) => ({ rho_w: tp.inputs.rho_w, theta_deg: tp.expected.theta_deg }));
if (caRows.length < 5) fail("contact-angle table: fewer than 5 valid rows");
const thetas = caRows.sort((a, b) => a.rho_w - b.rho_w).map((r) => r.theta_deg);
if (!thetas.every((t, i) => i === 0 || t < thetas[i - 1]))
  fail("contact-angle table: theta(rho_w) no longer monotone");
const lamb = pointsByName("lbm-multiphase-lamb.json")["lamb-tierB-TTc0.8"].expected;
if (!(lamb.rel_err_vs_two_density < lamb.declared_band))
  fail(`lamb table: rel err ${lamb.rel_err_vs_two_density} outside the declared band ${lamb.declared_band}`);
const eq = readJson(join(tablesDir, "d2q9-equilibrium.json"));
// recompute one equilibrium row in JS f64 (pinned shifted form)
const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const CXJ = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const CYJ = [0, 0, 1, 0, -1, 1, 1, -1, -1];
let eqChecked = 0;
for (const tp of eq.test_points) {
  const { rho, u } = tp.inputs;
  const u2 = u[0] * u[0] + u[1] * u[1];
  for (let i = 0; i < 9; i++) {
    const cu = 3 * (CXJ[i] * u[0] + CYJ[i] * u[1]);
    const want = W[i] * (rho - 1 + rho * (cu + 0.5 * cu * cu - 1.5 * u2));
    if (Math.abs(want - tp.expected.f_eq_shifted[i]) > 1e-15)
      fail(`equilibrium table drift at ${tp.inputs.name}[${i}]`);
    eqChecked++;
  }
}
ok(`golden tables: coexistence/laplace/contact/lamb invariants + ${eqChecked} eq values recomputed`);

// --- 5. WGSL + solver anchors ---------------------------------------------------
const wgsl = readFileSync(join(here, "src", "lbm_core.wgsl"), "utf8");
for (const fn of ["psi_pass", "collide_stream", "paint", "tracer_step"]) {
  const count = (wgsl.match(new RegExp(`fn ${fn}\\(`, "g")) || []).length;
  if (count !== 1) fail(`WGSL anchor fn ${fn}: ${count} matches (want exactly 1)`);
}
if (!wgsl.includes("0.027777777777777776")) fail("WGSL diagonal weight literal drifted");
const solverTs = readFileSync(join(here, "src", "solver.ts"), "utf8");
const mEps = solverTs.match(/EPS_PSI2 = ([0-9.e+-]+)/);
const refPy = readFileSync(
  join(repo, "packages", "lbm-multiphase", "lbm_multiphase", "reference.py"),
  "utf8",
);
const mEpsPy = refPy.match(/EPS_PSI2: Final\[float\] = ([0-9.e+-]+)/);
if (!mEps || !mEpsPy || Number(mEps[1]) !== Number(mEpsPy[1]))
  fail("EPS_PSI2 drift between solver.ts and reference.py");
ok("WGSL/solver anchors pinned (kernels, weights, EPS_PSI2)");

// --- emit --------------------------------------------------------------------
if (failures > 0) {
  console.error(`\ngen-verification: ${failures} failure(s) — build blocked.`);
  process.exit(1);
}
const out = {
  generated_by: "packages/lbm-multiphase/web/gen-verification.mjs",
  gate: {
    kind: "new_canonical",
    descriptor: man.scenes.descriptor,
    checkpoints: man.scenes.flat.checkpoints,
    pointwise_checkpoints: man.scenes.pointwise_checkpoints,
    coex_steps: man.scenes.coex_steps,
  },
  reference_bins: man.assets.reference_bins,
  psi_lut_sha: man.assets.psi_lut.sha256,
  tolerance: {
    category: "lbm-multiphase",
    relative: tolRelative,
    coex_rel_l: coexRelL,
    coex_rel_v: coexRelV,
    tau_spread_abs: tauSpread,
    laplace_rel: lapRel,
    laplace_r2_min: lapR2,
    spurious_max: spuriousMax,
    nosep_spread_max: nosepMax,
    measured_basis:
      "MEASURED 2026-07-11 f32-proxy: traj worst 6.8e-4; coex 6e-5/1.7e-4; tau 4.8e-5; laplace sigma diff 2e-4, R2 0.99886; spurious 1.9e-3; nosep 1.45e-2",
  },
  goldens: {
    coex_rho_l: man.targets.maxwell_tier_a.rho_l,
    coex_rho_v: man.targets.maxwell_tier_a.rho_v,
    sigma_a: lapFitA.sigma,
    sigma_a_browser_protocol: man.targets.laplace_browser_protocol.sigma,
    sigma_b: lapFitB.sigma,
    lamb_rel_err: lamb.rel_err_vs_two_density,
  },
};
mkdirSync(join(here, "src", "generated"), { recursive: true });
writeFileSync(
  join(here, "src", "generated", "verification.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log("gen-verification: all checks passed; verification.json written.");
