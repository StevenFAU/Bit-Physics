// Build-time data spine: reads the committed f64 gate sidecar and emits
// src/generated/verification.json — the single source the UI quotes for
// gate params, tolerance provenance, and reference anchors (never retyped
// by hand in TS/HTML).
//
// Usage: node packages/phase-field-fracture/web/gen-verification.mjs

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sidecar = JSON.parse(
  readFileSync(join(here, "public/pff-gate-sent96-f64.json"), "utf8"),
);
const binBytes = readFileSync(join(here, "public/pff-gate-sent96-f64.bin"));
const binSha = createHash("sha256").update(binBytes).digest("hex");
if (binSha !== sidecar.sha256) {
  throw new Error(
    `gate reference bin sha mismatch: sidecar ${sidecar.sha256} vs file ${binSha}`,
  );
}

const spine = {
  gate: {
    kind: "new_canonical",
    descriptor: sidecar.params.descriptor,
    ...sidecar.params,
  },
  tolerance: {
    category: "phase-field-fracture",
    relative: 1e-3,
    // pointwise gate stops PRE-BURST; the snap-back is gated by observables
    pre_burst_last_step: 12000,
    peak_band_rel: 0.02,
    efrac_band_rel: 0.05,
    iou_min: 0.95,
    measured_basis:
      "NumPy-f32 dtype-preserving proxy 2026-07-09: pre-burst worst 5.4e-6, " +
      "with-burst worst 9.0e-5, x4.05 family spread x~2.7 margin -> 1e-3",
  },
  published: {
    peak_kn: 0.7012,
    band_rel: 0.1,
    force_unit_n: 2.7,
    source:
      "PhaseFieldX example-1711 reproduction of the Miehe 2010 SENT peak " +
      "(a reproduction value, not a Miehe digit — spec-ref § 4 A)",
  },
  reference_bin: {
    file: sidecar.file,
    sha256: sidecar.sha256,
    witness_sha256: sidecar.determinism_witness_sha256,
    layout: sidecar.layout,
    peak_reaction: sidecar.reference.peak_reaction,
    peak_u_applied: sidecar.reference.peak_u_applied,
    e_frac_final: sidecar.reference.e_frac_final,
    ke_over_ie_pre_peak: sidecar.reference.ke_over_ie_pre_peak,
    energy_residual_pre_peak: sidecar.reference.energy_residual_pre_peak,
    checkpoints: sidecar.diagnostics.map((d) => d.step),
  },
  force_curve: sidecar.force_curve,
  at_constants: {
    // non-dim Miehe groups (Gc = ell = 1): recomputed live in PROVE
    e_tilde: sidecar.params.e_tilde,
    sigma_c_at1: Math.sqrt((3 * sidecar.params.e_tilde) / 8),
    sigma_c_at2: Math.sqrt((27 * sidecar.params.e_tilde) / 256),
    h_crit_at1: 3 / 16,
  },
};

mkdirSync(join(here, "src/generated"), { recursive: true });
writeFileSync(
  join(here, "src/generated/verification.json"),
  JSON.stringify(spine, null, 2) + "\n",
);
console.log(
  `verification.json written (gate ${spine.gate.descriptor}, ref peak ${spine.reference_bin.peak_reaction.toFixed(3)})`,
);
