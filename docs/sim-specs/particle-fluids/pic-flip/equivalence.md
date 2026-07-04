# pic-flip — Equivalence methodology

> Per spec-ref § 9.

## 1. Cross-mode structural equivalence (in-repo, tested)

PIC / FLIP / APIC share the P2G / grid / G2P scaffold; only the
reconstruction differs. Contracts witnessed by
`packages/pic-flip/tests/test_mode_equivalence.py`:

- **P2G:** PIC ≡ APIC with ``C == 0`` — *bit-identical* (same code
  path, zeroed affine array).
- **G2P velocity:** bit-identical between ``compute_affine``
  True/False (independent accumulators, identical iteration order);
  PIC's ``C`` output is identically zero.
- **FLIP null-force reduction:** with a zero grid-force delta, FLIP
  carries the particle velocity bit-exactly.
- **Sampling:** ``sample_grid_2d`` ≡ the G2P velocity reconstruction
  (bit-equal) — the FLIP old-field sample and the advection sampler
  share the transfer stencil.

## 2. Reference ↔ golden equivalence (gate 5)

The golden tables under `tools/testkit/golden/tables/particle-fluids/`
are generated in **exact rational arithmetic** and replayed through the
package kernels by the gate-5 tests. FP-honesty tiering (spec-ref § 7):

| configuration | assertion |
|---|---|
| dyadic-rational rows | **bit-for-bit f64 equality** (by construction) |
| generic rational rows | ≤ 1e-14 relative (measured, pinned) |
| MLS-MPM shape-function cross-anchor | ≤ 1e-15 absolute |

## 3. Web WGSL port equivalence (the frontend gate — next stage)

Per the web spec (`packages/pic-flip/web/verification-demo-spec.md`):
gate kind **`new_canonical`** — closed-form goldens evaluated
in-browser with the visitor's **measured** f32 residual (never an
asserted 0.0), fixed-point i32 atomic P2G bit-identical to a
fixed-point oracle (not to the f32 lex-order reference — the MPM
subtlety, stated honestly), run-twice byte-identity on-device, and
robust observables against the committed canonical capture (chaos-
sensitive per-particle trajectories are NOT gated pointwise).
Registration items at that stage: `GATE_KIND["pic-flip"] =
"new_canonical"` in `tools/productization/web-deploy/pipeline.py`, a
`_gate_pic_flip` in the web-deploy verifier, and a
`tools/testkit/equivalence/tolerance.toml` override.

## 4. Tolerance rationale

The reference's own conservation identities are exact-rational (§ 2
table); the only tolerance-bearing comparisons are (a) f64 summation-
order differences on non-dyadic configurations — bounded ≤ 1e-14
relative, measured by the generators at build time — and (b) the
future cross-stack captures, which will use the particle-fluids
`relative = 1e-4` family default (same category resolution as
sph-water) unless the Stage-1c measurement forces a documented
revision.
