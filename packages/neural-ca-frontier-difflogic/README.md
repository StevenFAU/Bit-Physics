# neural-ca-frontier-difflogic

Frozen-gate Differentiable Logic CA (Stack D / Taichi) — Phase 6 cluster C-1 unit U-2
(spec § 11.5 item 4.20; Phase-4 ledger row 28, deferred → Phase-4-Greenfield-CPU; charter
`docs/phases/phase-6/c1-charter.md` § 3.2, ratified D-3 scope).

The CA update rule is a **hand-constructed, frozen circuit** of the 16 two-input boolean
gates realised as multilinear extensions (Miotti, Niklasson, Randazzo, Mordvintsev 2025,
arXiv:2506.04912 — CITE-DON'T-IMPORT): an 8-neighbor popcount adder tree + equality tests
computing Conway's Game of Life **exactly** in the hard limit (verified exhaustively over
all 512 neighborhood configurations), and a smooth polynomial on soft states — the
tape-differentiable surface consumed through the WU-A autodiff substrate
(`SoftExcitationID`: recover a soft-excitation amplitude `alpha` from the final state).

No training anywhere (frozen wiring) ⇒ no training-loss distribution ⇒ no EFECT.

Spec sheet: `docs/sim-specs/continuous-ca/neural-ca/spec-frontier.md`. Golden table:
`tools/testkit/golden/tables/neural-ca-frontier-difflogic-gradient.json` (A1 gate truth
tables + midpoints / A2 exhaustive-512 GoL + fixtures / A3 central-FD gradient).

```bash
uv run --no-sync pytest packages/neural-ca-frontier-difflogic/tests/
```
