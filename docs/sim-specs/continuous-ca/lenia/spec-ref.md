# Lenia — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. Phase 3 task-3
> deliverable A per `docs/phases/phase-3-plan.md:1331`.
>
> **§0.3 SHIFT-from-discovered (mathematical, carried from charter
> §1.2):** §6.3 prose at `docs/phases/phase-3-plan.md:1351` says
> "kernel at r=0 (peak K(0))". Quad4 evaluates `K(0) = (4·0·1)^4 = 0`
> (a compact-support boundary, **not** a peak). The peak is at
> `r=0.5` where `4r(1-r) = 1`, so `K(0.5) = 1`. Three anchors:
> `(r=0, K=0)`, `(r=0.5, K=1)`, `(r=1, K=0)`. Hand-derivable; Stage
> 1b grounds in the vendored Chakazul source.

## 1. Scope

Reference Lenia continuous CA on Stack D (Taichi). Category:
`continuous-ca`. Variant: `lenia`. Stack: D (per
`docs/phases/phase-3-plan.md:154` + § 6.3 ROLE + the dispositive D-B
investigation audit
`docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md`).

Non-goals (Phase 4+ per § 6.3 OUT OF SCOPE
`docs/phases/phase-3-plan.md:1310-1312`): Stack-B port, Particle /
Flow / Diff Lenia variants, 3-D Lenia, save-creature UX, polyring
kernels.

Lenia is **terminal** in Phase 3
(`docs/phases/phase-3-plan.md:325`): no downstream Phase-3 task
imports `packages/lenia/` as a code dependency.

## 2. Upstream and reference anchor

- Chan, B. W.-C. (2019). *Lenia: biology of artificial life.*
  Complex Systems 28 (3), 251–286. Open-access mirror at
  https://www.complex-systems.com/abstracts/v28_i03_a01/. Algebraic
  anchor: § 2.2 (kernel + growth function) + § 3 (Orbium taxonomy).
- Chakazul/Lenia upstream — `https://github.com/Chakazul/Lenia`
  vendored at SHA `adfc542939266de7f4bb7ebb552e8499701ee107` (MIT,
  not archived, security clean at probe `2026-05-28T15-12-47Z`).
  Vendored to `references/Chakazul-Lenia/` at Stage 1b
  (`docs/phases/phase-3-plan.md:300-308` § 2.18 pin).
- Hand-derivation of Quad4 kernel:
  `tools/testkit/golden/derivations/lenia-kernel.md` (Stage 1b
  deliverable F per `docs/phases/phase-3-plan.md:1352`).

## 3. Algorithm

Lenia evolves a scalar field `A(x, t) ∈ [0, 1]` on a 2-D periodic grid
under:

1. Kernel convolution `U = K * A` with the Quad4 shape function
   (kernel domain `r = ||x - x'|| / R` for radius parameter `R`).
2. Growth function `G(U)` mapping the convolved field into a
   per-cell increment.
3. Explicit Euler step `A_{n+1} = clip(A_n + dt · G(U), 0, 1)`.

Implementation form: real-space Taichi-kernel convolution by default
(per § 6.3 D `docs/phases/phase-3-plan.md:1344-1346` + charter D-FFT
real-space-default lean). FFT opt-in only if Stage 1b probe finds a
stable AND bit-exact same-stack-same-hw Taichi-compatible FFT path
(charter §6 R-4 STOP-FFT for silent non-determinism).

The exact Quad4 + growth formulas are grep-cited to the vendored
Chakazul source file:line in the derivation
`tools/testkit/golden/derivations/lenia-kernel.md`.

## 4. Algebraic form

The hand-derivation of `K(r) = (4 r (1 - r))^4` (charter §4 anchors)
lands at `tools/testkit/golden/derivations/lenia-kernel.md`.

Verifiable form (charter §1.2 + §0.3):

```
K(r) = (4 r (1 - r))^4    for r ∈ [0, 1]
K(r) = 0                  for r > 1     (compact support)

Anchors:
  K(0)   = 0   (compact-support boundary; NOT a peak)
  K(0.5) = 1   (PEAK)
  K(1)   = 0   (compact-support boundary)
```

Growth (Chan 2019 § 2.2 form; subject to Stage-1b grep-cite):

```
G(u) = 2 · exp(-((u - mu) / sigma)^2 / 2) - 1
```

## 5. Implementation

- Python Stack-D reference:
  `packages/lenia/lenia/` (Taichi-backed).
- Shells landed at Stage 1a:
  - `packages/lenia/lenia/kernel.py` (`quad4_kernel`).
  - `packages/lenia/lenia/growth.py` (`growth_lenia`).
  - `packages/lenia/lenia/sim.py` (`LeniaConfig`, `LeniaSim`).
  - `packages/lenia/lenia/__main__.py` (CLI per § 3.2.6).
- Stage 1b implements all four against the vendored Chakazul source;
  the canonical Orbium capture is produced via
  `common_py.capture.Writer` + `set_taichi_deterministic(arch="cpu")`.

**§0.3 SHIFT layout note.** Plan § 6.3 prescribes
`continuous-ca/lenia/python/` at repo root; on-disk convention at HEAD
is `packages/<name>/` (per `packages/reaction-diffusion-2d/`,
`packages/reaction-diffusion-2d-stack-d/`, etc.). § 0.3 of
`docs/phases/phase-3-plan.md` declares existing-convention precedence;
charter ratifies `packages/lenia/`. SHIFTED-surface-only — NO plan
edit.

## 6. Verification posture (≥ 2 PBT invariants per spec § 2.14)

**Code verification.** Golden values at canonical radii / steps with
independent-reference anchors (≥ 3 per table per § 6.0 item 8 +
spec § 2.4). Golden tables land at
`tools/testkit/golden/tables/lenia-kernel.json` (K(r) at r=0, r=0.5,
r=1 plus mid-curve checks) and
`tools/testkit/golden/tables/lenia-orbium-trajectory.json` (field at
canonical steps, 64² grid).

**Solution verification.** N/A at Phase 3 (MMS for Lenia is Phase 4+
frontier scope per § 6.3 OUT OF SCOPE).

**Property-based tests** (≥ 2 invariants per § 2.14 +
`docs/phases/phase-3-plan.md:1042` § 6.0 item 7;
charter §1.1 first-SIM PBT-module surfacing).

**Stage 1b SHIFTED-on-evidence (HARD RULE 2 + §0.3).** The Stage-1a
charter §6 RED invariants suggested `mass_approximately_conserved` +
`monotone_bounds`. Stage 1b empirically measured that
`mass_approximately_conserved` is **mathematically falsified** for
arbitrary IC under Lenia's Quad4 polynomial growth (gn=1): the
growth function is not mass-preserving (cells where convolved value
is far from `mu` decay at rate -1; cells near `mu` grow at +1; the
balance is **not** a conservation law). The dispatch + charter
guidance was a *suggestion*, not a discovered mathematical truth;
per HARD RULE 2 + charter §6 anti-pattern reminder ("widening
Hypothesis examples or relaxing the assertion = anti-pattern; the
failing example IS the value"), the invariant is **re-declared**, NOT
widened. Stage 1b ratifies:

1. **`monotone_bounds`** — every cell of the field remains in
   `[0, 1]` for the duration of the run. Holds by the `clip(0, 1)`
   step in the Euler update; the test asserts the invariant survives
   the convolution + growth + clip composition (no `nan` / `inf`
   egress, no negative blow-up).
2. **`per_step_change_bounded_by_dt`** — every cell's per-step delta
   `|A_{n+1}(x) - A_n(x)| ≤ dt` for the Lenia Quad4-polynomial
   forward. Holds because `G ∈ [-1, 1]` (the Chakazul gn=1
   polynomial saturates at ±1) and the `clip(0, 1)` step can only
   bring the cell closer to `A_n` than the raw Euler update would.
   Sharper than `monotone_bounds` because it constrains the
   *derivative*, not just the value.

PBT module lives at `tools/testkit/property/sims/lenia/` per § 6.0
item 7 + charter §1.1; Hypothesis examples DB at
`packages/lenia/.hypothesis/` committed (NOT gitignored) per spec
§ 2.14 + § 6.0 item 7.

**Determinism (D-DET).** Bit-exact same-stack-same-hw via Taichi seed
per § 3.2.5 pre-baked row at
`docs/phases/phase-3-plan.md:479-486`. No atomics in the forward
convolution. Measured at Stage 1b (run twice with pinned seed +
`arch="cpu"`, diff zero); STOP-DET re-characterizes distributional +
EFECT if NOT bit-exact (charter §6 + smoke-stack-e gate-14 precedent).

**Mutation.** NO mutation gate at Stage 1c per D-MUT-SCOPE NO
RESOLVED-IN-CHARTER (§ 6.0 item 12 testkit-adjacent-only;
`docs/phases/phase-3-plan.md:1054-1058`).

## 7. Golden values / Manufactured solutions

- `tools/testkit/golden/tables/lenia-kernel.json` (Stage 1b) — K(r) at
  canonical radii. Three anchors per table with
  `independent_reference` JSON field per § 2.4:
  - `(r=0, K=0)` — hand-derivation (charter §4) + Chakazul source
    (Stage 1b grep-cite).
  - `(r=0.5, K=1)` — hand-derivation (charter §4); cross-check
    against Chakazul reference notebook IF discoverable.
  - `(r=1, K=0)` — hand-derivation (charter §4) + Chakazul source.
- `tools/testkit/golden/tables/lenia-orbium-trajectory.json` (Stage
  1b) — field at canonical steps, 64² grid; anchors at
  `(step=0)` (IC), `(step=mid)`, `(step=end)`.
- Derivation: `tools/testkit/golden/derivations/lenia-kernel.md`
  (Stage 1b deliverable F per `docs/phases/phase-3-plan.md:1352`).

## 8. Determinism

- Class: `bit-exact` per § 3.2.5
  (`docs/phases/phase-3-plan.md:479-486`).
- Scope: `same-stack-same-hw`.
- Atomic ops: `none` in the forward convolution (real-space
  Taichi-kernel writes are per-cell, no `ti.atomic_*`).
- Subgroup ops: `none` (CPU arch).
- Seed pinned: `true` via
  `common_py.determinism.set_taichi_deterministic(config, arch="cpu")`.

Registry row at `tools/testkit/determinism/registry.toml`
(`[continuous-ca.lenia]`) lands at Stage 1b.

## 9. Equivalence

N/A at Phase 3 — Lenia is single-stack (Stack D only). Stack-B
port + cross-stack equivalence are Phase 4+ scope per § 6.3 OUT OF
SCOPE.

Tolerance row at `tools/testkit/equivalence/tolerance.toml`
(`[continuous-ca.lenia]`) per § 3.2.4 pre-baked schema
(`docs/phases/phase-3-plan.md:426-433`):
- `golden_kernel_abs = 1e-6`
- `golden_kernel_rel = 1e-5`
- `golden_trajectory_abs = 1e-4`

These are golden-table tolerances (not cross-stack). The
`tolerance-budget.toml` shape at HEAD has only `cross_stack`
budgets, so these rows land un-capped-by-design (Stage-0 audit
FRICTION #1).

## 10. Diagnostics

Tier 3 module at `tools/diagnostics/tier3/lenia/` per
`docs/phases/phase-3-plan.md:556-578` § 3.2.9 (Stage 1b lands the
first `tools/diagnostics/tier3/` subtree — first time ever per
probe § 3.2).

Tier 1 / Tier 2 surfaces consumed:
- `diagnostics.check_health` — NaN/Inf scan against canonical capture.
- `diagnostics.check_bounds` (Tier 2 scalar_field) — field ∈ [0, 1]
  verification.

Tier-3 specific diagnostics: Lenia-specific creature-mass /
creature-velocity / kernel-shape sanity checks.

## 11. Build and run

- `just run-lenia` — invoke the CLI (Stage 1b).
- `just test-lenia` — run `pytest packages/lenia/tests/` (Stage 1b
  hookup).
- CI job: `.github/workflows/build-py.yml` `test-lenia` (Stage 1b
  per § 3.2.10 + § 6.3 M).

Direct invocation:
```
python -m lenia --seed 42 --steps 1000 --grid 256 \
  --preset orbium-unicaudatus --out captures/lenia/ \
  --tolerance-key continuous-ca.lenia --determinism-arch cpu
```
(Stage 1b lands the CLI; § 3.2.6 schema.)

## 12. References

- Chan 2019 (Complex Systems 28 (3)) — primary citation; § 2.2
  kernel + growth + § 3 Orbium taxonomy.
- Chakazul/Lenia upstream pinned at
  `adfc542939266de7f4bb7ebb552e8499701ee107` (MIT) — vendored at
  `references/Chakazul-Lenia/` at Stage 1b.
- `docs/phases/phase-3-plan.md` § 6.3 (`:1282-1373`) — task-3
  prompt (DELIVERABLES A–O).
- `docs/phases/phase-3-plan.md` § 6.0 item 12 (`:1054-1058`) —
  D-MUT-SCOPE NO scope authority.
- `docs/phases/sub-phase-phase-3-lenia.md` — charter (D-class
  ratifications + STOP routing).
- `docs/_audits/phase-3/sub-phase-phase-3-lenia-probe-2026-05-28T14-38-32Z.md` —
  anchor probe.
- `docs/_audits/phase-3/sub-phase-phase-3-lenia-db-investigation-2026-05-28T14-38-32Z.md` —
  D-B Stack-D dispositive investigation.

## 13. Productization status

Reference. Phase 3 task-3 is **terminal** in Phase 3
(`docs/phases/phase-3-plan.md:325`). Phase 4+ may port to Stack B,
add 3-D / particle / flow variants, polyring kernels, save-creature
UX — out of scope here.
