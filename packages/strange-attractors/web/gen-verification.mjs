// gen-verification.mjs — per-sim verification data spine (spec § 4).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts imports statically. Values
// are copied verbatim — never retyped — so the in-browser verification card
// cannot drift from the repository. The emitted file is committed; this
// script re-runs on prebuild/predev and must be idempotent (acceptance § 7.4:
// `node gen-verification.mjs && git diff --exit-code`).
//
// FAIL-HARD CONTRACT (spec § 4): any missing source file, WGSL anchor pattern
// that does not match exactly once, or unparsed verify.py/perf-ledger value
// aborts with a non-zero exit. No silent fallbacks.
//
// Node builtins only — this is the repo's first web codegen script and the
// template the other six sims may adopt; it must stay dependency-free.

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

// --- 1. Canonical capture manifest (params/checksum/determinism, verbatim) --

const MANIFEST_PATH =
  "captures/strange-attractors-ref/lorenz-trajectory-seed42-step10000.json";
const manifest = JSON.parse(read(MANIFEST_PATH));
for (const [path, val] of [
  ["config.params", manifest.config?.params],
  ["config.seed", manifest.config?.seed],
  ["run.step_count", manifest.run?.step_count],
  ["payload.checksum", manifest.payload?.checksum],
  ["determinism.claimed", manifest.determinism?.claimed],
]) {
  if (val === undefined) fail(`${MANIFEST_PATH}: missing field ${path}`);
}

// --- 2. Gate thresholds (anchored regex over verify.py ESTABLISHED block) ---

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
function threshold(name) {
  const m = verifyPy.match(new RegExp(`"${name}":\\s*"([0-9.]+)"`, "g"));
  if (!m || m.length !== 1) {
    fail(`${VERIFY_PATH}: threshold "${name}" matched ${m ? m.length : 0} times (want 1)`);
  }
  return Number(m[0].match(/"([0-9.]+)"$/)[1]);
}
const tolerances = {
  strange_minmaxstd_rel: threshold("strange_minmaxstd_rel"),
  strange_mean_abs: threshold("strange_mean_abs"),
};

// --- 3. WGSL code anchors (exact-substring, must match exactly once) -------

const WGSL_PATH = "packages/strange-attractors/src/lorenz_rk4.wgsl";
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
const sigmaA = anchorLine("sigma_term", "P.sigma * (s.y - s.x)");
const rhoA = anchorLine("rho_term", "s.x * (P.rho - s.z) - s.y");
const betaA = anchorLine("beta_term", "s.x * s.y - P.beta * s.z");
const rk4Start = anchorLine("rk4_start", "let k1 = field(s);");
const rk4End = anchorLine("rk4_end", "(P.dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)");
const entryA = anchorLine("entry", "@compute @workgroup_size(1)");
if (rk4End.line <= rk4Start.line) fail(`${WGSL_PATH}: rk4 anchor range inverted`);
const codeAnchors = {
  sigma_term: sigmaA,
  rho_term: rhoA,
  beta_term: betaA,
  rk4: {
    start: rk4Start.line,
    end: rk4End.line,
    lines: wgslLines.slice(rk4Start.line - 1, rk4End.line).map((l) => l.replace(/^  /, "")),
  },
  entry: { line: entryA.line },
};

// --- 4. Measured wall-clocks (perf-ledger rows, anchored) -------------------

const LEDGER_PATH = "docs/perf-ledger.md";
const ledger = read(LEDGER_PATH);
function ledgerSeconds(stack) {
  const re = new RegExp(
    `^\\| strange-attractors \\| ${stack} \\| lorenz-trajectory-seed42-step10000 \\| ([0-9.]+) \\|`,
    "m",
  );
  const m = ledger.match(re);
  if (!m) fail(`${LEDGER_PATH}: no row for stack "${stack}"`);
  return Number(m[1]);
}

// --- 5. X-A family systems (spec § 4 data-spine extension) ------------------
// Per-system committed sources, verbatim: the backend capture manifest
// (params/checksum/determinism), the structural golden table (tolerances),
// and exact-substring anchors into the ratified display kernel. Same
// FAIL-HARD contract as the Lorenz anchors.

const FIELDS_WGSL_PATH = "packages/strange-attractors/web/src/fields/attractors_rk4.wgsl";
const fieldsWgsl = read(FIELDS_WGSL_PATH);
const fieldsLines = fieldsWgsl.split("\n");
function fieldsAnchor(label, needle) {
  const hits = fieldsLines
    .map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => text.includes(needle));
  if (hits.length !== 1) {
    fail(`${FIELDS_WGSL_PATH}: anchor "${label}" (${needle}) matched ${hits.length} lines (want 1)`);
  }
  return { line: hits[0].line, text: hits[0].text.trim() };
}

const FAMILY = {
  rossler: {
    anchors: {
      dx: fieldsAnchor("rossler_dx", "-s.y - s.z,"),
      dy: fieldsAnchor("rossler_dy", "s.x + P.p0 * s.y,"),
      dz: fieldsAnchor("rossler_dz", "P.p1 + s.z * (s.x - P.p2),"),
    },
    golden: "tools/testkit/golden/tables/closed-form/rossler-structural.json",
    derivation: "tools/testkit/golden/derivations/rossler-structural.md",
  },
  aizawa: {
    anchors: {
      dx: fieldsAnchor("aizawa_dx", "(s.z - P.p1) * s.x - P.p3 * s.y,"),
      dy: fieldsAnchor("aizawa_dy", "P.p3 * s.x + (s.z - P.p1) * s.y,"),
      dz: fieldsAnchor("aizawa_dz", "P.p2 + P.p0 * s.z - (s.z * s.z * s.z) / 3.0"),
    },
    golden: "tools/testkit/golden/tables/closed-form/aizawa-structural.json",
    derivation: "tools/testkit/golden/derivations/aizawa-structural.md",
  },
  sprott_a: {
    anchors: {
      dx: fieldsAnchor("sprott_a_dx", "s.y,  // sprott-a: dx/dt"),
      dy: fieldsAnchor("sprott_a_dy", "-s.x + s.y * s.z,"),
      dz: fieldsAnchor("sprott_a_dz", "1.0 - s.y * s.y,"),
    },
    golden: "tools/testkit/golden/tables/closed-form/sprott-a-structural.json",
    derivation: "tools/testkit/golden/derivations/sprott-a-structural.md",
  },
  thomas: {
    anchors: {
      dx: fieldsAnchor("thomas_dx", "sin(s.y) - P.p0 * s.x,"),
      dy: fieldsAnchor("thomas_dy", "sin(s.z) - P.p0 * s.y,"),
      dz: fieldsAnchor("thomas_dz", "sin(s.x) - P.p0 * s.z,"),
    },
    golden: "tools/testkit/golden/tables/closed-form/thomas-structural.json",
    derivation: "tools/testkit/golden/derivations/thomas-structural.md",
  },
  halvorsen: {
    anchors: {
      dx: fieldsAnchor("halvorsen_dx", "-P.p0 * s.x - 4.0 * s.y - 4.0 * s.z - s.y * s.y,"),
      dy: fieldsAnchor("halvorsen_dy", "-P.p0 * s.y - 4.0 * s.z - 4.0 * s.x - s.z * s.z,"),
      dz: fieldsAnchor("halvorsen_dz", "-P.p0 * s.z - 4.0 * s.x - 4.0 * s.y - s.x * s.x,"),
    },
    golden: "tools/testkit/golden/tables/closed-form/halvorsen-structural.json",
    derivation: "tools/testkit/golden/derivations/halvorsen-structural.md",
  },
  dadras: {
    anchors: {
      dx: fieldsAnchor("dadras_dx", "s.y - P.p0 * s.x + P.p1 * s.y * s.z,"),
      dy: fieldsAnchor("dadras_dy", "P.p2 * s.y - s.x * s.z + s.z,"),
      dz: fieldsAnchor("dadras_dz", "P.p3 * s.x * s.y - P.p4 * s.z,"),
    },
    golden: "tools/testkit/golden/tables/closed-form/dadras-structural.json",
    derivation: "tools/testkit/golden/derivations/dadras-structural.md",
  },
  chen: {
    anchors: {
      dx: fieldsAnchor("chen_dx", "P.p0 * (s.y - s.x),"),
      dy: fieldsAnchor("chen_dy", "(P.p2 - P.p0) * s.x - s.x * s.z + P.p2 * s.y,"),
      dz: fieldsAnchor("chen_dz", "s.x * s.y - P.p1 * s.z,"),
    },
    golden: "tools/testkit/golden/tables/closed-form/chen-structural.json",
    derivation: "tools/testkit/golden/derivations/chen-structural.md",
  },
  fourwing: {
    anchors: {
      dx: fieldsAnchor("fourwing_dx", "P.p0 * s.x + P.p2 * s.y * s.z,"),
      dy: fieldsAnchor("fourwing_dy", "P.p1 * s.x + P.p3 * s.y - s.x * s.z,"),
      dz: fieldsAnchor("fourwing_dz", "P.p4 * s.z + P.p5 * s.x * s.y,"),
    },
    golden: "tools/testkit/golden/tables/closed-form/fourwing-structural.json",
    derivation: "tools/testkit/golden/derivations/fourwing-structural.md",
  },
};

const systems = {};
for (const [name, cfg] of Object.entries(FAMILY)) {
  const manifestPath = `captures/strange-attractors-ref/${name}-trajectory-seed42-step10000.json`;
  const m = JSON.parse(read(manifestPath));
  for (const [path, val] of [
    ["config.params", m.config?.params],
    ["config.seed", m.config?.seed],
    ["run.step_count", m.run?.step_count],
    ["payload.checksum", m.payload?.checksum],
    ["determinism.claimed", m.determinism?.claimed],
  ]) {
    if (val === undefined) fail(`${manifestPath}: missing field ${path}`);
  }
  if (/^sha256:0+$/.test(m.payload.checksum) || m.payload.checksum.length < 71) {
    fail(`${manifestPath}: payload checksum is not a real digest`);
  }
  const golden = JSON.parse(read(cfg.golden));
  if (!golden.tolerance || !Array.isArray(golden.test_points) || golden.test_points.length < 3) {
    fail(`${cfg.golden}: expected tolerance block + >=3 test points`);
  }
  systems[name] = {
    descriptor: `${name}-trajectory-seed42-step10000`,
    seed: m.config.seed,
    step_count: m.run.step_count,
    params: m.config.params,
    payload_sha256: m.payload.checksum,
    determinism_claimed: m.determinism.claimed,
    golden_table: cfg.golden,
    golden_tolerance: golden.tolerance,
    golden_quantities: golden.test_points.map((tp) => tp.inputs.quantity),
    derivation: cfg.derivation,
    manifest: manifestPath,
    code_anchors: cfg.anchors,
  };
}

// --- 6. Emit -----------------------------------------------------------------

const out = {
  _generated_by: "packages/strange-attractors/web/gen-verification.mjs — do not edit by hand",
  sim: "strange-attractors",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "new_canonical + run-twice",
    tolerances,
  },
  determinism: {
    reference_claimed: manifest.determinism.claimed,
    browser_claimed: "epsilon",
    run_twice: "byte-identical",
  },
  canonical: {
    descriptor: "lorenz-trajectory-seed42-step10000",
    seed: manifest.config.seed,
    step_count: manifest.run.step_count,
    params: manifest.config.params,
    payload_sha256: manifest.payload.checksum,
    wall_clock_reference_s: ledgerSeconds("numpy-reference"),
    wall_clock_browser_s: ledgerSeconds("webgpu-headless-chromium"),
  },
  code_anchors: codeAnchors,
  systems,
  links: {
    kernel: WGSL_PATH,
    spec: "docs/sim-specs/closed-form/strange-attractors/spec-ref.md",
    algebraic: "docs/sim-specs/closed-form/strange-attractors/algebraic.md",
    determinism: "docs/sim-specs/closed-form/strange-attractors/determinism.md",
    audit: "docs/_audits/phase-5/sub-phase-web-deploy-5.1-landing-2026-06-09T04-12-03Z.md",
    perf_ledger: LEDGER_PATH,
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
