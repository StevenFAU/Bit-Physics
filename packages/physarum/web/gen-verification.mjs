// gen-verification.mjs — per-sim verification data spine (verification-demo-spec § 4).
//
// Reads the sim's COMMITTED sources of truth and emits
// src/generated/verification.json, which main.ts / explain.ts / verify-panel.ts
// import statically. Values are copied verbatim — never retyped — so the
// in-browser verification card, live mass gate, falsifiability probe and
// integer-atomics honesty story cannot drift from the repository. The emitted
// file is committed; this script re-runs on prebuild/predev and must be
// idempotent (acceptance § 7: `node gen-verification.mjs && git diff --exit-code`).
//
// FAIL-HARD CONTRACT (spec § 4): any missing source file, WGSL anchor pattern
// that does not match exactly once, or unparsed verify.py / perf-ledger value
// aborts with a non-zero exit. No silent fallbacks.
//
// Node builtins only (Lorenz/ising template, packages/*/web/gen-verification.mjs).

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

const MANIFEST_PATH = "captures/physarum-ref/network-canonical-seed42-step5000.json";
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
const P = manifest.config.params; // { L_move, L_sense, decay_alpha, delta_phi_deg, deposit, n_agents }

// --- 2. Gate threshold + mechanism (verify.py, anchored) --------------------

const VERIFY_PATH = "tools/productization/web-deploy/verify.py";
const verifyPy = read(VERIFY_PATH);
const massRelThreshold = Number(
  matchOne("T_PHYSARUM_MASS_REL", verifyPy, VERIFY_PATH, /^T_PHYSARUM_MASS_REL = ([0-9.e+-]+)$/m)[1],
);
matchOne("gate fn", verifyPy, VERIFY_PATH, /def _gate_physarum\(bundles: list\[dict\]\)/);
matchOne("gate kind", verifyPy, VERIFY_PATH, /sim="physarum",\s*\n\s*kind="new_canonical",/);
const atomicStrategy = matchOne(
  "atomic strategy note",
  verifyPy,
  VERIFY_PATH,
  /"atomic_strategy": "([^"]+)"/,
)[1];

// --- 3. Perf-ledger rows: oracle + browser measurement ----------------------

const LEDGER_PATH = "docs/perf-ledger.md";
const ledger = read(LEDGER_PATH);
const ledgerRow = (stack) =>
  matchOne(
    `ledger row ${stack}`,
    ledger,
    LEDGER_PATH,
    new RegExp(`^\\| physarum \\| ${stack} \\| network-canonical-seed42-step5000 \\| ([0-9.]+) \\|.*$`, "m"),
  );
const refRow = ledgerRow("numpy-reference");
const browserRow = ledgerRow("webgpu-headless-chromium");

const browserMeasured = matchOne(
  "browser mass measurement",
  browserRow[0],
  LEDGER_PATH,
  /total_mass ([0-9.]+) vs canonical ([0-9]+) \(rel \*\*([0-9.e+-]+)\*\* < ([0-9.e+-]+)\)/,
);
const recordedBrowser = {
  total_mass: Number(browserMeasured[1]),
  canonical_total_mass: Number(browserMeasured[2]),
  mass_rel: Number(browserMeasured[3]),
};
if (Number(browserMeasured[4]) !== massRelThreshold) {
  fail(`${LEDGER_PATH}: browser row threshold ${browserMeasured[4]} != verify.py T_PHYSARUM_MASS_REL ${massRelThreshold}`);
}
const browserBackend = matchOne("browser backend", browserRow[0], LEDGER_PATH, /browser-WebGPU, ([^)]+)\)/)[1];
const browserDate = matchOne("browser row date", browserRow[0], LEDGER_PATH, /\| (\d{4}-\d{2}-\d{2}) \|/)[1];

// --- 4. Mass equilibrium — the exact closed-form invariant ------------------
//
// apply adds deposit·N per step; diffuse box-blurs (sum-preserving, periodic
// BC) then ×(1−α). Steady state M = (M + dN)(1−α) ⇒ M = dN(1−α)/α.
const massEquilibrium = (P.deposit * P.n_agents * (1 - P.decay_alpha)) / P.decay_alpha;
if (Math.abs(massEquilibrium - recordedBrowser.canonical_total_mass) > 1e-6) {
  fail(
    `mass equilibrium d·N·(1−α)/α = ${massEquilibrium} disagrees with the ledger canonical total_mass ` +
      `${recordedBrowser.canonical_total_mass} — the closed form or the manifest params drifted`,
  );
}

// --- 5. Canonical params echoed from the sim spec (algebraic.md) ------------

const ALGEBRAIC_PATH = "docs/sim-specs/agent-based/physarum/algebraic.md";
const algebraic = read(ALGEBRAIC_PATH);
matchOne(
  "canonical params",
  algebraic,
  ALGEBRAIC_PATH,
  /\\Delta\\phi = 45°.*L_s = 9.*L_m = 1.*d = 5.*\\alpha = 0\.1/s,
);

// --- 6. WGSL code anchors (exact-substring, must match exactly once) --------

const WGSL_PATH = "packages/physarum/src/physarum.wgsl";
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
anchorLine("integer-atomics rationale", "integer add is order-independent, giving the");
const codeAnchors = {
  sense: anchorRange(
    "sense",
    "let lr = sample(p.x + P.l_sense * hl.x",
    "let rr = sample(p.x + P.l_sense * hr.x",
  ),
  rotate: anchorRange("rotate", "let mx = max(max(lr, cr), rr);", "else { nh = hr; }"),
  move: anchorRange("move", "let np = p + P.l_move * nh;", "head[i * 2u] = nh.x; head[i * 2u + 1u] = nh.y;"),
  deposit: anchorRange(
    "deposit",
    "let dx = u32(wrapi(i32(round(np.x)), i32(P.w)));",
    "atomicAdd(&dep[dx * P.h + dy], add);",
  ),
  scale: anchorLine("scale", "const SCALE: f32 = 65536.0;"),
  deposit_scale: anchorLine("deposit_scale", "let add = u32(round(P.deposit * SCALE));"),
  apply: anchorRange("apply", "let d = f32(atomicLoad(&dep[idx])) / SCALE;", "T_out[idx] = T_in[idx] + d;"),
  diffuse: anchorRange(
    "diffuse",
    "for (var di = -1; di <= 1; di = di + 1) {",
    "T_out[gid.x * P.h + gid.y] = (sum / 9.0) * (1.0 - P.decay_alpha);",
  ),
};

// --- 7. IC asset (the committed seed-42 pos+head the protocol replays) ------

const IC_REL = "packages/physarum/web/public/physarum-ic-seed42.bin";
const icBytes = readBytes(IC_REL);
if (icBytes.length !== P.n_agents * 4 * 4) {
  fail(`${IC_REL}: ${icBytes.length} bytes, want ${P.n_agents * 4 * 4} (n_agents·(2 pos + 2 head)·f32)`);
}

// --- 8. Template gallery (params + food + science captions) -----------------
//
// Committed here so the definitions are one source of truth, deterministic and
// idempotent (no Math.random). Morphology templates write liveParamBuf only;
// science scenarios seed persistent food into the live deposit channel and
// carry a client-side MST-optimum overlay. Food coordinates are on the 256²
// live grid, honestly labelled as schematic layouts (not survey geography).
const eq = (params) => (params.deposit * P.n_agents * (1 - params.decay_alpha)) / params.decay_alpha;
const morph = (id, title, caption, delta_phi_deg, L_sense, L_move, deposit, decay_alpha) => {
  const params = { delta_phi_deg, L_sense, L_move, deposit, decay_alpha };
  const invariant = deposit === P.deposit && decay_alpha === P.decay_alpha;
  return {
    id,
    category: "morphology",
    title,
    caption,
    params,
    mass_axis: invariant ? "invariant" : "value-changing",
    mass_equilibrium: eq(params),
  };
};

// Kanto-region schematic (Tero 2010 style): a central Tokyo cluster with spokes
// to Yokohama/Chiba/Saitama/Hachioji/Tsukuba/Mito/Utsunomiya… — a SCHEMATIC
// layout in the spirit of the paper, not survey-accurate geography.
const TOKYO_FOOD = [
  [130, 148], [120, 145], [122, 152], [123, 138], [132, 140], [128, 156],
  [112, 170], [100, 185], [95, 198], [105, 205], [80, 190], [60, 195],
  [175, 150], [160, 145], [200, 130], [230, 140], [155, 178],
  [125, 95], [105, 90], [150, 45], [185, 95], [215, 70],
  [70, 140], [90, 135], [72, 120], [85, 60], [40, 150],
  [78, 175], [85, 160], [205, 190],
];
// Cosmic-web homage (Burchett 2020 style, 2D): galaxy-like points clustered
// into nodes with sparse bridges — a labelled 2D analogy of the 3D MCPM.
const COSMIC_FOOD = [
  [58, 58], [66, 50], [50, 66], [70, 68], [46, 52],
  [192, 66], [200, 58], [184, 74], [204, 78], [186, 56],
  [110, 182], [118, 190], [102, 176], [122, 172], [98, 192],
  [200, 192], [208, 184], [190, 198], [210, 200], [196, 178],
  [70, 150], [62, 158], [80, 144],
  [128, 118], [136, 110], [120, 126], // central node
  [96, 104], [150, 150], [168, 108], [88, 130], [150, 88], [176, 168],
];
// Steiner square (Adamatzky): the textbook 4-corner set where the shortest tree
// (Steiner) adds two interior junctions that the MST cannot — physarum grows the
// redundant, junction-rich version.
const STEINER_FOOD = [
  [92, 92], [164, 92], [92, 164], [164, 164],
];

const scenario = (id, title, caption, source, food, L_sense) => ({
  id,
  category: "scenario",
  title,
  caption,
  source,
  food,
  mst_overlay: true,
  open_system: true,
  // scenarios grow the network with canonical deposition (so the closed-run
  // equilibrium formula still applies) and slightly longer sensing to connect
  params: { delta_phi_deg: 45, L_sense, L_move: 1, deposit: P.deposit, decay_alpha: P.decay_alpha },
});

const templates = [
  morph(
    "canonical",
    "Jones 2010 Table-1 sensing — the capture regime.",
    "Δφ 45°, L_sense 9, d 5, α 0.1 — the committed canonical set. Mass holds at the gated 22500.",
    P.delta_phi_deg, P.L_sense, P.L_move, P.deposit, P.decay_alpha,
  ),
  morph(
    "reticular",
    "short sensors, low decay — a dense reticular mesh.",
    "Δφ 45°, L_sense 4, α 0.04: small-scale sensing and slow decay weave a fine closed mesh. α moves the equilibrium — the formula still predicts it.",
    45, 4, 1, 5, 0.04,
  ),
  morph(
    "strands",
    "far sensors — sparse veins and strands.",
    "Δφ 45°, L_sense 24: long-range sensing pulls sparse, large-scale corridors. Morphology axis — mass stays 22500.",
    45, 24, 1, 5, 0.1,
  ),
  morph(
    "trunk",
    "narrow steering — few straight trunk lines.",
    "Δφ 22.5°, L_sense 9: slow turning forges few, straight, heavily reinforced trunks. Morphology axis — mass stays 22500.",
    22.5, 9, 1, 5, 0.1,
  ),
  morph(
    "fragments",
    "short sensors, fast decay — fine fragments.",
    "Δφ 45°, L_sense 3, α 0.2: fine sensing and fast decay break the trail into short fragments. α moves the equilibrium.",
    45, 3, 1, 5, 0.2,
  ),
  morph(
    "dendritic",
    "wide angle — branching, dendritic growth.",
    "Δφ 60°, L_sense 12, α 0.08: wide steering near the branching boundary (Jones 2010: larger rotation angle → dendritic). α moves the equilibrium.",
    60, 12, 1, 5, 0.08,
  ),
  scenario(
    "tokyo-rail",
    "connect the cities — Tero 2010's Tokyo-rail setup.",
    "≈30 food sources on a schematic Kanto layout (Tero 2010 style, not survey geography). The emergent network vs the exact minimum spanning tree: Tero measured MD_MST 0.85 transport efficiency and TL_MST ≈ 1.75 cost for real Physarum — with the real rail beating it only on fault tolerance.",
    "Tero et al. 2010, Science 327:439 — Rules for Biologically Inspired Adaptive Network Design",
    TOKYO_FOOD, 12,
  ),
  scenario(
    "cosmic-web",
    "find the filaments — a 2D cosmic-web homage.",
    "Galaxy-like food clustered into nodes with sparse bridges — a labelled 2D analogy of the 3D Monte-Carlo Physarum Machine that reconstructed dark-matter filaments from 37,000 SDSS galaxies (Burchett/Elek 2020). Not the actual 3D reconstruction.",
    "Burchett, Elek et al. 2020, ApJL 891:L35 — Revealing the Dark Threads of the Cosmic Web",
    COSMIC_FOOD, 14,
  ),
  scenario(
    "steiner",
    "the Steiner square — optimum vs emergent.",
    "Four corners: the minimum spanning tree is three edges, but the shortest possible tree (Steiner) adds two interior junctions. Physarum grows the redundant, junction-rich network — approximation, not guaranteed optimum (cf. Adamatzky; the reality-check arXiv:1712.03139).",
    "Adamatzky — Physarum Machines (spanning / Steiner trees)",
    STEINER_FOOD, 12,
  ),
];

// --- 9. Emit -----------------------------------------------------------------

const out = {
  _generated_by: "packages/physarum/web/gen-verification.mjs — do not edit by hand",
  sim: "physarum",
  repo_blob_base: "https://github.com/StevenFAU/Bit-Physics/blob/main/",
  gate: {
    kind: "new_canonical",
    mass_rel_threshold: massRelThreshold,
    criterion: "run-twice byte-identical AND |M − M_eq| / M_eq < mass_rel_threshold",
    atomic_strategy: atomicStrategy,
    recorded_browser: {
      ...recordedBrowser,
      backend: browserBackend,
      date: browserDate,
    },
    run_twice: "byte-identical",
    cross_hw_note:
      "two live runs match each other on any one GPU (integer atomics remove the only ordering nondeterminism); " +
      "they match the committed sha only on the reference hardware — off-reference the non-atomic float passes " +
      "(sense/diffuse) round differently so the field/sha differ while the mass stays exactly conserved. That is " +
      "why the gate is determinism + the mass invariant, not a field-sha match.",
  },
  mass_equilibrium: {
    formula: "d·N·(1−α)/α",
    canonical_value: massEquilibrium,
    d: P.deposit,
    N: P.n_agents,
    alpha: P.decay_alpha,
    open_system_formula: "(d·N + food)·(1−α)/α",
    morphology_invariant_axes: ["delta_phi_deg", "L_sense", "L_move"],
    value_changing_axes: ["deposit", "n_agents", "decay_alpha"],
    derivation:
      "apply adds d·N per step (physarum.wgsl apply); diffuse is a sum-preserving 3×3 box blur ×(1−α) (physarum.wgsl diffuse); " +
      "steady state M = (M + dN)(1−α) ⇒ M = dN(1−α)/α",
  },
  determinism: {
    claimed: manifest.determinism.claimed,
    run_twice: "byte-identical",
    field_note:
      "the deposit atomicAdd is the sim's ONLY cross-invocation reduction — every other op (sense/rotate/move/diffuse) " +
      "is a per-invocation IEEE-deterministic float computation; integerizing that one atomic (u32 fixed-point ×65536) " +
      "is therefore SUFFICIENT for same-hardware bit-exactness. Float atomicAdd would be non-associative → non-deterministic.",
  },
  canonical: {
    descriptor: "network-canonical-seed42-step5000",
    seed: manifest.config.seed,
    grid: manifest.config.dims,
    n_agents: P.n_agents,
    steps: manifest.run.step_count,
    capture_interval: manifest.run.capture_interval,
    params: {
      delta_phi_deg: P.delta_phi_deg,
      L_sense: P.L_sense,
      L_move: P.L_move,
      deposit: P.deposit,
      decay_alpha: P.decay_alpha,
    },
    payload_sha256: manifest.payload.checksum,
    wall_clock_reference_s: Number(refRow[1]),
    wall_clock_browser_s: Number(browserRow[1]),
  },
  falsify: {
    wrong_mass_factor: 1.5,
    note:
      "falsifiability-probe target (spec § 3.3): the SAME mass criterion checked against a deliberately wrong " +
      "canonical mass (1.5× the equilibrium) — NOT a gate parameter; the true conserved mass then reads mass_rel ≫ threshold → FAIL.",
  },
  templates,
  surfaces: {
    numpy_reference_s: Number(refRow[1]),
    webgpu_headless_s: Number(browserRow[1]),
  },
  ic_asset: {
    asset: "physarum-ic-seed42.bin",
    bytes: icBytes.length,
    sha256: createHash("sha256").update(icBytes).digest("hex"),
    provenance: "the committed seed-42 agent positions + headings the canonical protocol replays — shipped verbatim",
  },
  code_anchors: codeAnchors,
  links: {
    kernel: WGSL_PATH,
    spec: "docs/sim-specs/agent-based/physarum/spec-ref.md",
    algebraic: ALGEBRAIC_PATH,
    capture_manifest: MANIFEST_PATH,
    gate_source: VERIFY_PATH,
    perf_ledger: LEDGER_PATH,
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
