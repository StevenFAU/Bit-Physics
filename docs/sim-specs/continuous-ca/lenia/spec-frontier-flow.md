# spec-frontier-flow.md — flow-lenia (Flow Lenia frontier variant)

> **Status:** LANDED (Phase-4 batch-3, sim 3/3; FINAL). De-stubbed from the shared Phase-4.0
> `spec-frontier.md` pre-stage slot (D-SPEC-SPLIT: split into per-variant
> `spec-frontier-particle.md` / `spec-frontier-flow.md`; the shared stub is removed at this landing).
> **Parent reference sim:** `docs/sim-specs/continuous-ca/lenia/spec-ref.md` (grid Lenia).
> **Variant type:** `frontier-flow-lenia`. **Primary stack:** D (Taichi).
> **Package:** `packages/flow-lenia/` (import `flow_lenia`).
> **Charter:** `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md` § 3.3 / § 4.3.

## § 1 Scope

Mass-conservative **Flow Lenia** (Plantec et al., ALIFE 2022; arXiv:2212.07906). Matter is
transported by **reintegration tracking**: each cell sends its full mass to the flow-displaced
target, distributed over neighbours with weights summing to 1, so total mass `Σ A` is conserved by
construction (to summation roundoff ~Nε, NOT bit-exact). A genuine reformulation of grid Lenia (the
update rule is transport-by-flow, not growth-add).

## § 2 Physics / governing equations

Engine step: `U = K * A` (Gaussian convolution, periodic); flow `F = ∇U` (central differences);
reintegration `A_{t+dt}(p) = Σ_{p'} A_t(p')·I(p',p)` (forward bilinear splat, `ti.atomic_add`
scatter). `dt=0.2`, periodic BC. The flow is the affinity gradient; the full α-weighted Flow Lenia
flow `F = (1−α)∇U − α∇A_Σ` (arXiv:2212.07906) is a documented extension — the conservation /
non-negativity / zero-flow invariants are flow-agnostic. The bilinear splat is the
point-distribution limit of the paper's uniform square distribution `D` (both redistribute full mass).

## § 3 Verification surfaces

1. **Conservation golden table (gate-4, ≥3 independent anchors):**
   `tools/testkit/golden/tables/flow-lenia-conservation.json` — see § 8.
   `tests/test_conservation_golden.py`; derivation
   `tools/testkit/golden/derivations/flow-lenia-conservation.md`.
2. **Parent-vs-frontier (REFRAMED invariant posture):** Flow Lenia is *intentionally* not
   pointwise-equal to grid Lenia (different transport dynamics) → equivalence is the rigorous
   mass-conservation / non-negativity / zero-flow INVARIANT (plan §8.4). gate-14 N/A (single-stack).
3. **Determinism:** step + rollout bit-identical run-to-run (§ 4).

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (Taichi CPU single-thread serial fixes the `ti.atomic_add`
scatter accumulation order; f64; seed-pinned mass IC). Registry
`tools/testkit/determinism/registry.toml` `[continuous-ca.flow-lenia]` (`atomic_ops = "sum-only"` —
the reintegration scatter). **The bit-exact run-to-run determinism is DISTINCT from the mass
INVARIANT**, which is conserved only to summation roundoff (~Nε) — declared separately. No EFECT.

## § 5 Capture

Rollout capture (per-step `(grid, grid)` mass field `A`), schema 1.0.0, via
`common_py.capture.Writer`. Canonical `captures/flow-lenia-ref/`; schema-corpus fixture
`tests/fixtures/legacy-captures/phase-4-flow-lenia.h5` (LFS).

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`total_mass_conserved`** (variant-axis; the genuine Flow Lenia delta): the reintegration step
   conserves `Σ A` to summation roundoff (~Nε, NOT bit-exact) for random configs. **The SOUND home
   of the Phase-3 plain-Lenia `mass_approximately_conserved` invariant FALSIFIED under Quad4** —
   re-routed here where it holds by construction (not widened).
2. **`mass_non_negative`** (forward-physics): the bilinear-splat keeps `A ≥ 0` for random
   non-negative ICs.

`packages/flow-lenia/flow_lenia/invariants.py`; `tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Plantec, Hamon, Etcheverry, Oudeyer, Moulin-Frier, Chan (2022), *"Flow-Lenia: Towards open-ended
  evolution in cellular automata through mass conservation and parameter localization"*, ALIFE 2022
  (arXiv:2212.07906) — the reintegration-tracking mass-conservation scheme.
- The parent grid Lenia reference (`packages/lenia/`) — the kernel/affinity lineage.

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

1. **A1 — exact mass conservation** by the reintegration mass balance (`Σ_p I(p',p) = 1`):
   `Σ A_{t+dt} == Σ A_t` to summation roundoff (~Nε; MEASURED ~1e-16 per step — the honest tolerance,
   NOT bit-exact). arXiv:2212.07906; hand-derived.
2. **A2 — non-negativity:** bilinear-splat of non-negative mass with non-negative weights → `A ≥ 0`
   (distinct invariant: range, not sum). Hand-derived.
3. **A3 — zero-flow identity:** `F ≡ 0` ⇒ `A` unchanged pointwise (EXACT residual 0.0). The
   advection-by-zero-velocity degenerate case (distinct: a pointwise identity). Hand-derived.

**OPERATOR HONEST-TOLERANCE (load-bearing):** mass conservation is conserved to floating-point
**summation roundoff (~Nε), NOT bit-exact** (MEASURED, regime-scoped to periodic BC). The bit-exact
run-to-run determinism is a SEPARATE property. **D-DET:** measured bit-exact (§ 4). **D-EQUIV:**
REFRAMED invariant posture. **D-MUT:** advisory `flow_lenia` target.

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-flow-lenia.h5` (LFS; Stage 1c).

## § 10 Determinism ↔ capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"`, `atomic_ops = true` (the reintegration
scatter uses `ti.atomic_add`) ↔ § 4 registry row.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Rollout wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c; 0.130s).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree; MATCHED at the 1a commit).

## Gate-14 / mutation

**gate-14 N/A** — single-stack (no cross-stack sibling); parent-vs-frontier REFRAMED to the
invariant posture. **Mutation target** (§ 8.7, advisory): `flow_lenia`.
