# lenia (Phase 3 task-3)

Reference Lenia continuous CA on Stack D (Taichi). Quad4 kernel + Orbium
unicaudatus preset; real-space Taichi-kernel convolution (D-FFT default
per charter); bit-exact same-stack-same-hw via Taichi seed (D-DET, no
atomics in forward conv); ≥ 2 PBT invariants per spec § 2.14.

## Reference

- Chan, B. W.-C. (2019). *Lenia: biology of artificial life.*
  Complex Systems 28 (3), 251–286.
  https://www.complex-systems.com/abstracts/v28_i03_a01/
- Chakazul/Lenia upstream, vendored at
  `references/Chakazul-Lenia/` (SHA
  `adfc542939266de7f4bb7ebb552e8499701ee107`, MIT). See
  `docs/sim-specs/continuous-ca/lenia/spec-ref.md` § 2.

## Spec sheet

- `docs/sim-specs/continuous-ca/lenia/spec-ref.md` (13-section template
  per `docs/architecture.md` § 8.2).
- Hand-derivation of Quad4 kernel:
  `tools/testkit/golden/derivations/lenia-kernel.md` (Stage 1b).

## Layout (§0.3 SHIFT-from-discovered)

Plan §6.3 prescribes `continuous-ca/lenia/python/`; on-disk convention
at HEAD is `packages/<name>/` (per `packages/reaction-diffusion-2d/`,
`packages/reaction-diffusion-2d-stack-d/`, etc.). §0.3 of `docs/phases/
phase-3-plan.md` declares existing-convention precedence over §3.2
prescriptions; Stage-0 audit FRICTION #2 carries this forward;
Stage-1a charter ratifies `packages/lenia/`. The charter +
plan-drafting audit document SHIFTED-surface-only (NO plan edit).

## Stage status

- Stage 1a — scaffold (this commit) + RED tests (separate commit) +
  spec-ref stub + probe report.
- Stage 1b — Taichi impl + golden tables (≥ 3 anchors per table) +
  Tier-3 + PBT (≥ 2 invariants) + legacy-capture seed + perf-ledger
  row + 13-gate.
- Stage 1c — verdict landing (NO mutation gate; D-MUT-SCOPE NO).
- Stage 2 — sub-phase landing audit + I7 allowlist + closing sweep +
  operator-tag proposal `v0.2.4-sub-phase-phase-3-lenia`.
