# C-1 / U-2 `neural-ca-frontier-difflogic` — unit landing report

> **Cluster:** Phase 6 / C-1 (charter `docs/phases/phase-6/c1-charter.md`, RATIFIED § 10;
> D-3 frozen-gate scope governs).
> **Unit:** U-2 = Phase-4 ledger row 28 / spec § 11.5 item 4.20 —
> `continuous-ca/neural-ca` frontier-difflogic variant, Stack D + § 4.2.A.
> **Verdict:** **LANDED** — 13 gates green (gate-14 N/A, single-stack), 22/22 tests,
> corpus 39/39.
> **Commit chain:** probe (`docs/_audits/phase-6/c1-u2-difflogic-ca-probe-2026-06-11T14-37-07Z.md`
> commit) → `96a235b` (stage-1a scaffold+RED, evidence footer-hashed) → `08c373e`
> (stage-1b GREEN + golden) → `7e0cc53` (stage-1c spec/perf/CI/corpus/mutation/gate-13) →
> *(stage-2 landing fold SHA back-filled per Convention #12)*.

## Gates (spec Appendix D.6)

| Gate | Verdict | Evidence |
|---|---|---|
| 1 spec sheet | GREEN | `docs/sim-specs/continuous-ca/neural-ca/spec-frontier.md` de-stubbed |
| 2 probe | GREEN | probe report (greenfield confirmed; REFRAMED parent-equivalence posture declared) |
| 3 failing-first | GREEN | 12-failed/10-pass RED at `96a235b` (passes = pure circuit goldens + hard rollout, the analytics-live-in-RED precedent); evidence footer-hashed, captured with the replay tool's exact flags |
| 4 golden (≥3 anchors) | GREEN | 9/9 points: A1 multilinear gate closed forms (hard-limit corners EXACT, all 16 gates), A2 exhaustive-512 GoL equality vs Gardner-1970 (the complete input space) + blinker/glider fixtures, A3 central-FD (ad-vs-fd ~1e-11 rel) |
| 5/6 Tier-1/2 | GREEN | health + [0,1] bounds on the capture |
| 7 citations | GREEN | Miotti 2025 arXiv:2506.04912 (live-verified, charter S-4); Gardner 1970 |
| 8 public API | GREEN | exports; mypy --strict + ruff clean |
| 9 capture | GREEN | `captures/neural-ca-frontier-difflogic/neural-ca-difflogic-recover-alpha-16sq-seed42.{h5,json}`, schema 1.1.0 `gradient_fields` (`dLoss_dalpha`), **run-twice byte-identical**; .h5 sha256 `05fa614ebcf94e449004fcc01e28728dc2c6ae085df8a9b99019ca28ef93e4af` |
| 10 determinism↔capture | GREEN | MEASURED bit-exact (hard trajectory + soft forward + gradient); registry `[continuous-ca.neural-ca-frontier-difflogic.{forward,gradient}]`; **no EFECT** (frozen gates) |
| 11 PBT (≥2) | GREEN | `hard_limit_matches_truth_table` + `gradient_matches_finite_difference` (+ supporting boundedness) |
| 12 perf-ledger | GREEN | row appended (0.469 s canonical solve, 3-run min; 354 Adam iters) |
| 13 failing-replay | GREEN | `replay_failing_tests --commit 96a235b` **match=True**, normalized sha `f56a70196b9704b5338804739de48ae593cbbceb4f6464f612b78c65af26dfe7` |
| 14 cross-stack | **N/A** | single-stack; frontier equivalence REFRAMED to the exact circuit goldens (different update family vs the trained parent NCA) |

## SHIFTs (documented, scope-preserving)

1. **Descriptor** (probe § 3 / spec § 5): D.2.3's `growing-emoji-…` row names the parent's
   trained-emoji test; canonical capture uses the problem-scoped
   `neural-ca-difflogic-recover-alpha-16sq-seed42` (U-1/batch-1 precedent). Routed D-6.
2. **Parent-equivalence REFRAMED** (probe § 1 / spec § 3): exact circuit goldens replace
   pointwise parent comparison (trained NCA = different update family; plan § 8.4
   REFRAME language; the batch-3 anchor strategy).
3. **Gate-13 evidence**: the stage-1a evidence (captured with the tool's flags) still
   differed in a pytest relative-vs-absolute pathlib display line; the B-2
   worktree-generated sibling evidence file is the byte-stable gate-13 record (match=True).
   Banked: even flag-matched in-root captures can differ in display-path form; prefer the
   B-2 worktree generation for the hashed gate-13 evidence.

## Ledger fold

`docs/phase4/ledger.md` row 28 → **landed** (this commit).

**Next unit per ratified § 4 order:** U-3 `lattice-boltzmann-frontier-moment-encoded`
(S29 / 4.21, Stack C + § 4.2.B; D-2 ratified new quantization tolerance category,
measured-then-declared).
